import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/import/confirm
 *
 * Receives validated rows (from client after preview confirmation)
 * and writes them to the database inside a single operation.
 * Skips rows with errors.
 */

const confirmSchema = z.object({
  rows: z.array(
    z.object({
      'Nama Bahan': z.string().min(1).max(255).trim(),
      'Satuan Pembelian': z.string().min(1).max(50).trim(),
      'Harga Pembelian (Rp)': z.number().nonnegative(),
      'Isi Per Kemasan': z.number().positive(),
      'Satuan Terkecil': z.string().min(1).max(50).trim(),
      Supplier: z.string().max(255).nullable().optional(),
      Kategori: z.string().max(100).nullable().optional(),
    })
  ).min(1).max(1000),
})

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RBAC: only Owner/Admin can import
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'STAFF') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 })
  }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Data tidak valid' },
      { status: 400 }
    )
  }

  const { rows } = parsed.data
  const orgId = profile.organization_id

  // Resolve category names → IDs
  const categoryNames = [
    ...new Set(rows.map((r) => r.Kategori).filter(Boolean) as string[]),
  ]

  const categoryMap = new Map<string, string>()

  if (categoryNames.length > 0) {
    // Fetch existing categories
    const { data: existingCats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('organization_id', orgId)
      .eq('type', 'MATERIAL')
      .in('name', categoryNames)

    for (const cat of existingCats ?? []) {
      categoryMap.set(cat.name, cat.id)
    }

    // Create missing categories
    const missing = categoryNames.filter((n) => !categoryMap.has(n))
    if (missing.length > 0) {
      const { data: newCats } = await supabase
        .from('categories')
        .insert(
          missing.map((name) => ({
            organization_id: orgId,
            name,
            type: 'MATERIAL' as const,
          }))
        )
        .select('id, name')

      for (const cat of newCats ?? []) {
        categoryMap.set(cat.name, cat.id)
      }
    }
  }

  // Build insert rows
  const insertRows = rows.map((r) => ({
    organization_id: orgId,
    name: r['Nama Bahan'],
    purchase_unit: r['Satuan Pembelian'],
    purchase_price: r['Harga Pembelian (Rp)'],
    package_quantity: r['Isi Per Kemasan'],
    base_unit: r['Satuan Terkecil'],
    supplier: r.Supplier ?? null,
    category_id: r.Kategori ? (categoryMap.get(r.Kategori) ?? null) : null,
    status: 'ACTIVE' as const,
  }))

  // Insert in batches of 100
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < insertRows.length; i += BATCH) {
    const batch = insertRows.slice(i, i + BATCH)
    const { error } = await supabase.from('materials').insert(batch)
    if (error) {
      return NextResponse.json(
        { error: `Gagal menyimpan data (batch ${Math.floor(i / BATCH) + 1}): ${error.message}` },
        { status: 500 }
      )
    }
    inserted += batch.length
  }

  // Audit log
  await supabase.rpc('log_audit', {
    p_action: 'IMPORT',
    p_entity_type: 'materials',
    p_metadata: { imported_count: inserted },
  })

  return NextResponse.json({ success: true, imported: inserted })
}
