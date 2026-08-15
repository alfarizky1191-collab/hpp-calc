'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/rbac'

export interface DashboardKpis {
  totalMaterials: number
  totalMenus: number
  activeMenus: number
  avgFoodCost: number | null
  avgMargin: number | null
  totalMenusWithHpp: number
}

export interface RankedMenu {
  id: string
  name: string
  selling_price: number
  target_food_cost: number
  total_hpp: number
  food_cost: number
  profit: number
  margin: number
  calculated_at: string
}

export interface DashboardAlert {
  type: 'food_cost_high' | 'price_increase' | 'no_hpp'
  severity: 'warning' | 'error' | 'info'
  menuId?: string
  menuName?: string
  materialId?: string
  materialName?: string
  message: string
  detail?: string
}

export interface ChartDataPoint {
  name: string
  hpp: number
  sellingPrice: number
  profit: number
  margin: number
  foodCost: number
}

export interface DashboardData {
  kpis: DashboardKpis
  highestMargin: RankedMenu[]
  highestProfit: RankedMenu[]
  highestFoodCost: RankedMenu[]
  needsAttention: RankedMenu[]
  alerts: DashboardAlert[]
  chartData: ChartDataPoint[]
}

export async function getDashboardData(): Promise<DashboardData> {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()
  const orgId = profile.organization_id

  // Fetch all data in parallel
  const [
    materialsRes,
    menusRes,
    calcsRes,
    recentPriceHistoryRes,
  ] = await Promise.all([
    // Total materials
    supabase
      .from('materials')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null),

    // All menus
    supabase
      .from('menus')
      .select('id, name, selling_price, target_food_cost, status')
      .eq('organization_id', orgId)
      .order('name'),

    // All HPP calculations (latest per menu)
    supabase
      .from('hpp_calculations')
      .select(
        'id, menu_id, total_hpp, selling_price, food_cost, profit, margin, calculated_at'
      )
      .eq('organization_id', orgId)
      .order('calculated_at', { ascending: false }),

    // Recent material price increases (last 30 days)
    supabase
      .from('material_price_history')
      .select(
        'material_id, old_price, new_price, created_at, materials(id, name, organization_id)'
      )
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const menus = menusRes.data ?? []
  const allCalcs = calcsRes.data ?? []

  // Build latest-per-menu map
  const latestCalcMap = new Map<string, (typeof allCalcs)[number]>()
  for (const c of allCalcs) {
    if (!latestCalcMap.has(c.menu_id)) latestCalcMap.set(c.menu_id, c)
  }

  // Build ranked menus list (only menus with HPP)
  const rankedMenus: RankedMenu[] = menus
    .filter((m) => latestCalcMap.has(m.id))
    .map((m) => {
      const calc = latestCalcMap.get(m.id)!
      return {
        id: m.id,
        name: m.name,
        selling_price: m.selling_price,
        target_food_cost: m.target_food_cost,
        total_hpp: calc.total_hpp,
        food_cost: calc.food_cost,
        profit: calc.profit,
        margin: calc.margin,
        calculated_at: calc.calculated_at,
      }
    })

  // KPIs
  const totalMenusWithHpp = rankedMenus.length
  const avgFoodCost =
    totalMenusWithHpp > 0
      ? rankedMenus.reduce((s, m) => s + m.food_cost, 0) / totalMenusWithHpp
      : null
  const avgMargin =
    totalMenusWithHpp > 0
      ? rankedMenus.reduce((s, m) => s + m.margin, 0) / totalMenusWithHpp
      : null

  const kpis: DashboardKpis = {
    totalMaterials: materialsRes.count ?? 0,
    totalMenus: menus.length,
    activeMenus: menus.filter((m) => m.status === 'ACTIVE').length,
    avgFoodCost,
    avgMargin,
    totalMenusWithHpp,
  }

  // Rankings
  const sorted = [...rankedMenus]
  const highestMargin = sorted.sort((a, b) => b.margin - a.margin).slice(0, 5)
  const highestProfit = [...rankedMenus].sort((a, b) => b.profit - a.profit).slice(0, 5)
  const highestFoodCost = [...rankedMenus].sort((a, b) => b.food_cost - a.food_cost).slice(0, 5)
  const needsAttention = rankedMenus
    .filter((m) => m.food_cost > m.target_food_cost + 3)
    .sort((a, b) => (b.food_cost - b.target_food_cost) - (a.food_cost - a.target_food_cost))
    .slice(0, 5)

  // Alerts
  const alerts: DashboardAlert[] = []

  // Alert: food cost above target
  for (const m of needsAttention) {
    alerts.push({
      type: 'food_cost_high',
      severity: m.food_cost > m.target_food_cost + 10 ? 'error' : 'warning',
      menuId: m.id,
      menuName: m.name,
      message: `Food cost ${m.name} melebihi target`,
      detail: `Food cost: ${m.food_cost.toFixed(1)}% (target: ${m.target_food_cost}%)`,
    })
  }

  // Alert: menus with no HPP
  const menusNoHpp = menus.filter(
    (m) => m.status === 'ACTIVE' && !latestCalcMap.has(m.id)
  )
  for (const m of menusNoHpp.slice(0, 3)) {
    alerts.push({
      type: 'no_hpp',
      severity: 'info',
      menuId: m.id,
      menuName: m.name,
      message: `${m.name} belum memiliki kalkulasi HPP`,
      detail: 'Hitung HPP di halaman Profitabilitas',
    })
  }

  // Alert: recent price increases
  const priceHistory = recentPriceHistoryRes.data ?? []
  const seenMats = new Set<string>()
  for (const ph of priceHistory) {
    const mat = ph.materials as { id: string; name: string; organization_id: string } | null
    if (!mat || mat.organization_id !== orgId) continue
    if (seenMats.has(mat.id)) continue
    seenMats.add(mat.id)
    if (ph.new_price > ph.old_price) {
      const pctIncrease = ((ph.new_price - ph.old_price) / ph.old_price) * 100
      alerts.push({
        type: 'price_increase',
        severity: pctIncrease > 20 ? 'error' : 'warning',
        materialId: mat.id,
        materialName: mat.name,
        message: `Harga ${mat.name} naik`,
        detail: `+${pctIncrease.toFixed(1)}% dalam 30 hari terakhir`,
      })
    }
  }

  // Sort alerts: errors first
  alerts.sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })

  // Chart data — top 8 menus by profit
  const chartData: ChartDataPoint[] = [...rankedMenus]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8)
    .map((m) => ({
      name: m.name.length > 14 ? m.name.slice(0, 13) + '…' : m.name,
      hpp: Math.round(m.total_hpp),
      sellingPrice: Math.round(m.selling_price),
      profit: Math.round(m.profit),
      margin: parseFloat(m.margin.toFixed(1)),
      foodCost: parseFloat(m.food_cost.toFixed(1)),
    }))

  return {
    kpis,
    highestMargin,
    highestProfit,
    highestFoodCost,
    needsAttention,
    alerts,
    chartData,
  }
}
