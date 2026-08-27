'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/rbac'
import { sanitizeError } from '@/lib/security/error-handler'
import { materialSchema, updateMaterialSchema } from './schemas'
import type { ActionResult } from '@/types'
import type { Tables, TablesUpdate } from '@/types/database'

export type MaterialRow = Tables<'materials'>

// ---------------------------------------------------------------------------
// createMaterial
// ---------------------------------------------------------------------------
export async function createMaterial(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const rawCategoryId = formData.get('categoryId')
  const raw = {
    name: formData.get('name'),
    // 'none' is the placeholder value from the Select component; treat as null
    categoryId: rawCategoryId && rawCategoryId !== 'none' ? rawCategoryId : null,
    purchaseUnit: formData.get('purchaseUnit'),
    purchasePrice: formData.get('purchasePrice'),
    packageQuantity: formData.get('packageQuantity'),
    baseUnit: formData.get('baseUnit'),
    supplier: formData.get('supplier') || null,
    notes: formData.get('notes') || null,
    status: formData.get('status') ?? 'ACTIVE',
  }

  const parsed = materialSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Input tidak valid',
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('materials')
    .insert({
      organization_id: profile.organization_id,
      name: parsed.data.name,
      category_id: parsed.data.categoryId ?? null,
      purchase_unit: parsed.data.purchaseUnit,
      purchase_price: parseFloat(parsed.data.purchasePrice),
      package_quantity: parseFloat(parsed.data.packageQuantity),
      base_unit: parsed.data.baseUnit,
      supplier: parsed.data.supplier ?? null,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: 'Gagal menyimpan bahan. Coba lagi.' }
  }

  // Audit log
  await supabase.rpc('log_audit', {
    p_action: 'CREATE',
    p_entity_type: 'material',
    p_entity_id: data.id,
    p_new_value: { name: parsed.data.name },
  })

  revalidatePath('/materials')
  return { success: true, data: { id: data.id } }
}

// ---------------------------------------------------------------------------
// updateMaterial
// ---------------------------------------------------------------------------
export async function updateMaterial(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const rawCategoryIdUpdate = formData.get('categoryId')
  const raw = {
    id: formData.get('id'),
    name: formData.get('name'),
    // 'none' is the placeholder value from the Select component; treat as null
    categoryId: rawCategoryIdUpdate && rawCategoryIdUpdate !== 'none' ? rawCategoryIdUpdate : null,
    purchaseUnit: formData.get('purchaseUnit'),
    purchasePrice: formData.get('purchasePrice'),
    packageQuantity: formData.get('packageQuantity'),
    baseUnit: formData.get('baseUnit'),
    supplier: formData.get('supplier') || null,
    notes: formData.get('notes') || null,
    status: formData.get('status') ?? 'ACTIVE',
  }

  const parsed = updateMaterialSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Input tidak valid',
    }
  }

  const supabase = await createClient()

  // Fetch old values for audit + price history trigger
  const { data: oldData } = await supabase
    .from('materials')
    .select('*')
    .eq('id', parsed.data.id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!oldData) {
    return { success: false, error: 'Bahan tidak ditemukan' }
  }

  const updatePayload: TablesUpdate<'materials'> = {}
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
  if (parsed.data.categoryId !== undefined) updatePayload.category_id = parsed.data.categoryId
  if (parsed.data.purchaseUnit !== undefined) updatePayload.purchase_unit = parsed.data.purchaseUnit
  if (parsed.data.purchasePrice !== undefined) updatePayload.purchase_price = parseFloat(parsed.data.purchasePrice)
  if (parsed.data.packageQuantity !== undefined) updatePayload.package_quantity = parseFloat(parsed.data.packageQuantity)
  if (parsed.data.baseUnit !== undefined) updatePayload.base_unit = parsed.data.baseUnit
  if (parsed.data.supplier !== undefined) updatePayload.supplier = parsed.data.supplier
  if (parsed.data.notes !== undefined) updatePayload.notes = parsed.data.notes
  if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status

  const { error } = await supabase
    .from('materials')
    .update(updatePayload)
    .eq('id', parsed.data.id)
    .eq('organization_id', profile.organization_id)

  if (error) {
    return { success: false, error: 'Gagal memperbarui bahan. Coba lagi.' }
  }

  await supabase.rpc('log_audit', {
    p_action: 'UPDATE',
    p_entity_type: 'material',
    p_entity_id: parsed.data.id,
    p_old_value: { name: oldData.name, purchase_price: oldData.purchase_price },
    p_new_value: updatePayload,
  })

  revalidatePath('/materials')
  revalidatePath(`/materials/${parsed.data.id}`)
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// deleteMaterial — soft delete
// ---------------------------------------------------------------------------
export async function deleteMaterial(id: string): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  if (!id) return { success: false, error: 'ID tidak valid' }

  const supabase = await createClient()

  const { error, count } = await supabase
    .from('materials')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: profile.id,
      status: 'INACTIVE',
    }, { count: 'exact' })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .is('deleted_at', null)

  if (error) {
    return { success: false, error: sanitizeError(error, 'deleteMaterial') }
  }

  if (count === 0) {
    return { success: false, error: 'Bahan tidak ditemukan atau sudah dihapus.' }
  }

  await supabase.rpc('log_audit', {
    p_action: 'DELETE',
    p_entity_type: 'material',
    p_entity_id: id,
  })

  revalidatePath('/materials')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// restoreMaterial — undo soft delete
// ---------------------------------------------------------------------------
export async function restoreMaterial(id: string): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  if (!id) return { success: false, error: 'ID tidak valid' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('materials')
    .update({
      deleted_at: null,
      deleted_by: null,
      status: 'ACTIVE',
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) {
    return { success: false, error: 'Gagal memulihkan bahan. Coba lagi.' }
  }

  await supabase.rpc('log_audit', {
    p_action: 'UPDATE',
    p_entity_type: 'material',
    p_entity_id: id,
    p_new_value: { restored: true },
  })

  revalidatePath('/materials')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// getMaterials — server-side fetch with search + filter
// ---------------------------------------------------------------------------
export async function getMaterials(params: {
  q?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'all'
  categoryId?: string | null
  page?: number
  pageSize?: number
}) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('materials')
    .select('*, categories(name)', { count: 'exact' })
    .eq('organization_id', profile.organization_id)
    .order('name', { ascending: true })
    .range(from, to)

  // Status filter
  if (!params.status || params.status === 'ACTIVE') {
    query = query.is('deleted_at', null).eq('status', 'ACTIVE')
  } else if (params.status === 'INACTIVE') {
    query = query.not('deleted_at', 'is', null)
  }
  // 'all' = no filter

  // Search
  if (params.q) {
    query = query.ilike('name', `%${params.q}%`)
  }

  // Category filter
  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId)
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], total: 0, error: error.message }
  }

  return { data: data ?? [], total: count ?? 0, error: null }
}

// ---------------------------------------------------------------------------
// getMaterialById — with price history
// ---------------------------------------------------------------------------
export async function getMaterialById(id: string) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const [materialRes, historyRes] = await Promise.all([
    supabase
      .from('materials')
      .select('*, categories(name)')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single(),
    supabase
      .from('material_price_history')
      .select('*')
      .eq('material_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (materialRes.error || !materialRes.data) {
    return { material: null, history: [], error: 'Bahan tidak ditemukan' }
  }

  return {
    material: materialRes.data,
    history: historyRes.data ?? [],
    error: null,
  }
}
