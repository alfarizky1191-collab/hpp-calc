import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createWorkbook,
  workbookToBuffer,
  buildMaterialsSheet,
  buildMenusSheet,
  buildHppSheet,
  buildPriceHistorySheet,
} from '@/lib/excel/export'

const ALLOWED_REPORTS = ['materials', 'menus', 'hpp', 'price-history', 'full'] as const
type ReportType = (typeof ALLOWED_REPORTS)[number]

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RBAC: Staff can only export limited reports
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = profile.organization_id

  // Report type from query param
  const type = request.nextUrl.searchParams.get('type') as ReportType | null
  if (!type || !ALLOWED_REPORTS.includes(type)) {
    return NextResponse.json(
      { error: 'Parameter type tidak valid. Gunakan: materials, menus, hpp, price-history, full' },
      { status: 400 }
    )
  }

  // Staff cannot export full or hpp reports
  if (profile.role === 'STAFF' && (type === 'full' || type === 'hpp')) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const wb = createWorkbook()
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

    // Fetch and build sheets based on type
    if (type === 'materials' || type === 'full') {
      const { data: materials } = await supabase
        .from('materials')
        .select('*, categories(name)')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('name')

      buildMaterialsSheet(
        wb,
        (materials ?? []).map((m) => ({
          ...m,
          category: (m.categories as { name: string } | null)?.name ?? null,
        }))
      )
    }

    if (type === 'menus' || type === 'full') {
      const { data: menus } = await supabase
        .from('menus')
        .select('*, categories(name)')
        .eq('organization_id', orgId)
        .order('name')

      // Get latest HPP per menu
      const menuIds = (menus ?? []).map((m) => m.id)

      type CalcRow = { menu_id: string; total_hpp: number; food_cost: number; profit: number; margin: number; calculated_at: string }
      let calcs: CalcRow[] = []
      if (menuIds.length > 0) {
        const res = await supabase
          .from('hpp_calculations')
          .select('menu_id, total_hpp, food_cost, profit, margin, calculated_at')
          .eq('organization_id', orgId)
          .in('menu_id', menuIds)
          .order('calculated_at', { ascending: false })
        calcs = (res.data ?? []) as CalcRow[]
      }

      const latestMap = new Map<string, CalcRow>()
      for (const c of calcs ?? []) {
        if (!latestMap.has(c.menu_id)) latestMap.set(c.menu_id, c)
      }

      buildMenusSheet(
        wb,
        (menus ?? []).map((m) => {
          const calc = latestMap.get(m.id)
          return {
            ...m,
            category: (m.categories as { name: string } | null)?.name ?? null,
            total_hpp: calc?.total_hpp ?? null,
            food_cost: calc?.food_cost ?? null,
            profit: calc?.profit ?? null,
            margin: calc?.margin ?? null,
          }
        })
      )
    }

    if (type === 'hpp' || type === 'full') {
      const { data: calcs } = await supabase
        .from('hpp_calculations')
        .select('*, menus(name), recipes(version)')
        .eq('organization_id', orgId)
        .order('calculated_at', { ascending: false })
        .limit(500)

      buildHppSheet(
        wb,
        (calcs ?? []).map((c) => ({
          menu_name: (c.menus as { name: string } | null)?.name ?? '—',
          recipe_version: (c.recipes as { version: number } | null)?.version ?? 0,
          material_cost: c.material_cost,
          packaging_cost: c.packaging_cost,
          overhead_cost: c.overhead_cost,
          other_cost: c.other_cost,
          total_hpp: c.total_hpp,
          selling_price: c.selling_price,
          food_cost: c.food_cost,
          profit: c.profit,
          margin: c.margin,
          calculated_at: c.calculated_at,
          calculation_version: c.calculation_version,
        }))
      )
    }

    if (type === 'price-history' || type === 'full') {
      const { data: history } = await supabase
        .from('material_price_history')
        .select('*, materials(name, organization_id)')
        .order('created_at', { ascending: false })
        .limit(1000)

      const filtered = (history ?? []).filter(
        (h) => (h.materials as { organization_id: string } | null)?.organization_id === orgId
      )

      buildPriceHistorySheet(
        wb,
        filtered.map((h) => ({
          material_name: (h.materials as { name: string } | null)?.name ?? '—',
          old_price: h.old_price,
          new_price: h.new_price,
          change_pct:
            h.old_price > 0 ? ((h.new_price - h.old_price) / h.old_price) * 100 : 0,
          created_at: h.created_at,
        }))
      )
    }

    const buffer = workbookToBuffer(wb)
    const filename = `hpp-manager-${type}-${dateStr}.xlsx`

    // Audit log
    await supabase.rpc('log_audit', {
      p_action: 'EXPORT',
      p_entity_type: 'report',
      p_metadata: { type, filename },
    })

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[export]', err)
    return NextResponse.json(
      { error: 'Gagal membuat file export' },
      { status: 500 }
    )
  }
}
