'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/rbac'
import {
  calculateRecipeCost,
  calculateHpp,
  calculateFoodCost,
  calculateProfit,
  calculateMargin,
  calculatePriceRecommendation,
  runWhatIfSimulation,
  HPP_ENGINE_VERSION,
} from '@/lib/hpp'
import type { ActionResult } from '@/types'
import type { Tables } from '@/types/database'
import type { WhatIfInput, WhatIfResult } from '@/lib/hpp/simulate-what-if'

export type HppCalculationRow = Tables<'hpp_calculations'>

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const calculateHppSchema = z.object({
  menuId: z.string().uuid(),
  recipeId: z.string().uuid(),
  overheadCost: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Overhead harus angka positif')
    .default('0'),
  otherCost: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Biaya lain harus angka positif')
    .default('0'),
  notes: z.string().max(500).optional().nullable(),
})

// ---------------------------------------------------------------------------
// calculateAndSaveHpp
// Core server action — recalculates everything from source data, saves snapshot.
// ---------------------------------------------------------------------------
export async function calculateAndSaveHpp(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<HppCalculationRow>> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const raw = {
    menuId: formData.get('menuId'),
    recipeId: formData.get('recipeId'),
    overheadCost: formData.get('overheadCost') ?? '0',
    otherCost: formData.get('otherCost') ?? '0',
    notes: formData.get('notes') || null,
  }

  const parsed = calculateHppSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()

  // ── 1. Fetch menu (selling_price, target_food_cost) ──────────────────────
  const { data: menu } = await supabase
    .from('menus')
    .select('selling_price, target_food_cost')
    .eq('id', parsed.data.menuId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!menu) return { success: false, error: 'Menu tidak ditemukan.' }

  // ── 2. Fetch recipe (yield) ───────────────────────────────────────────────
  const { data: recipe } = await supabase
    .from('recipes')
    .select('yield_quantity, yield_unit')
    .eq('id', parsed.data.recipeId)
    .single()

  if (!recipe) return { success: false, error: 'Resep tidak ditemukan.' }

  // ── 3. Fetch recipe items with CURRENT unit costs ─────────────────────────
  // We use CURRENT unit_cost from materials (not snapshot) so the new
  // calculation always reflects today's prices.
  const { data: recipeItems } = await supabase
    .from('recipe_items')
    .select('material_id, quantity, unit, materials(unit_cost)')
    .eq('recipe_id', parsed.data.recipeId)

  if (!recipeItems || recipeItems.length === 0) {
    return { success: false, error: 'Resep belum memiliki bahan. Tambahkan bahan terlebih dahulu.' }
  }

  // ── 4. Fetch packaging costs total ───────────────────────────────────────
  const { data: packaging } = await supabase
    .from('packaging_costs')
    .select('total_cost')
    .eq('menu_id', parsed.data.menuId)

  const totalPackaging = (packaging ?? []).reduce((s, p) => s + p.total_cost, 0)

  // ── 5. Server-side HPP calculation (source of truth) ─────────────────────
  const items = recipeItems.map((ri) => ({
    materialId: ri.material_id,
    quantity: ri.quantity.toString(),
    unitCost: (ri.materials as { unit_cost: number } | null)?.unit_cost?.toString() ?? '0',
  }))

  const { totalMaterialCost, hppBahanPerUnit } = calculateRecipeCost({
    items,
    yieldQuantity: recipe.yield_quantity.toString(),
  })

  // Packaging, overhead, and other costs are per-menu totals — divide by yield
  // to get the per-unit (per-porsi) cost before summing into total HPP.
  const yieldQty = recipe.yield_quantity
  const packagingPerUnit = (totalPackaging / yieldQty).toFixed(6)
  const overheadPerUnit = (parseFloat(parsed.data.overheadCost) / yieldQty).toFixed(6)
  const otherPerUnit = (parseFloat(parsed.data.otherCost) / yieldQty).toFixed(6)

  const { totalHpp, breakdown } = calculateHpp({
    hppBahan: hppBahanPerUnit,
    packagingCost: packagingPerUnit,
    overheadCost: overheadPerUnit,
    otherCost: otherPerUnit,
  })

  const sellingPrice = menu.selling_price.toString()

  const { foodCostPct } = calculateFoodCost({
    hppBahan: hppBahanPerUnit,
    sellingPrice,
  })

  const { profit } = calculateProfit({ sellingPrice, totalHpp })

  const { marginPct } = calculateMargin({ profit, sellingPrice })

  // ── 6. Save snapshot ──────────────────────────────────────────────────────
  const { data: saved, error: saveErr } = await supabase
    .from('hpp_calculations')
    .insert({
      organization_id: profile.organization_id,
      menu_id: parsed.data.menuId,
      recipe_id: parsed.data.recipeId,
      material_cost: parseFloat(hppBahanPerUnit),
      packaging_cost: parseFloat(breakdown.packagingCost),
      overhead_cost: parseFloat(breakdown.overheadCost),
      other_cost: parseFloat(breakdown.otherCost),
      total_hpp: parseFloat(totalHpp),
      selling_price: menu.selling_price,
      food_cost: parseFloat(foodCostPct),
      profit: parseFloat(profit),
      margin: parseFloat(marginPct),
      calculation_version: HPP_ENGINE_VERSION,
      calculated_by: profile.id,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single()

  if (saveErr || !saved) {
    return { success: false, error: 'Gagal menyimpan hasil kalkulasi.' }
  }

  await supabase.rpc('log_audit', {
    p_action: 'CREATE',
    p_entity_type: 'hpp_calculation',
    p_entity_id: saved.id,
    p_new_value: {
      menu_id: parsed.data.menuId,
      total_hpp: totalHpp,
      food_cost: foodCostPct,
      margin: marginPct,
    },
  })

  revalidatePath('/profitability')
  revalidatePath(`/profitability/${parsed.data.menuId}`)
  return { success: true, data: saved }
}

// ---------------------------------------------------------------------------
// getMenusWithLatestHpp — profitability list
// ---------------------------------------------------------------------------
export async function getMenusWithLatestHpp() {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  // Fetch all active menus
  const { data: menus, error } = await supabase
    .from('menus')
    .select('id, name, selling_price, target_food_cost, status, categories(name)')
    .eq('organization_id', profile.organization_id)
    .order('name')

  if (error) return { data: [], error: error.message }

  // Fetch latest HPP calculation per menu
  const menuIds = (menus ?? []).map((m) => m.id)
  if (menuIds.length === 0) return { data: [], error: null }

  const { data: calcs } = await supabase
    .from('hpp_calculations')
    .select('id, menu_id, total_hpp, food_cost, profit, margin, calculated_at, selling_price')
    .eq('organization_id', profile.organization_id)
    .in('menu_id', menuIds)
    .order('calculated_at', { ascending: false })

  type CalcRow = {
    id: string
    menu_id: string
    total_hpp: number
    food_cost: number
    profit: number
    margin: number
    calculated_at: string
    selling_price: number
  }

  // Keep only the latest per menu
  const latestCalcMap = new Map<string, CalcRow>()
  for (const calc of calcs ?? []) {
    if (!latestCalcMap.has(calc.menu_id)) {
      latestCalcMap.set(calc.menu_id, calc)
    }
  }

  const result = (menus ?? []).map((menu) => ({
    ...menu,
    latestHpp: latestCalcMap.get(menu.id) ?? null,
  }))

  return { data: result, error: null }
}

// ---------------------------------------------------------------------------
// getHppHistory — history per menu
// ---------------------------------------------------------------------------
export async function getHppHistory(menuId: string, limit = 20) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hpp_calculations')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .eq('menu_id', menuId)
    .order('calculated_at', { ascending: false })
    .limit(limit)

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

// ---------------------------------------------------------------------------
// getProfitabilityDetail — all data needed for detail page
// ---------------------------------------------------------------------------
export async function getProfitabilityDetail(menuId: string) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const [menuRes, recipesRes, packagingRes, historyRes] = await Promise.all([
    supabase
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .eq('organization_id', profile.organization_id)
      .single(),
    supabase
      .from('recipes')
      .select('id, version, yield_quantity, yield_unit, status')
      .eq('menu_id', menuId)
      .order('version', { ascending: false }),
    supabase
      .from('packaging_costs')
      .select('total_cost')
      .eq('menu_id', menuId),
    supabase
      .from('hpp_calculations')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('menu_id', menuId)
      .order('calculated_at', { ascending: false })
      .limit(10),
  ])

  if (menuRes.error || !menuRes.data) {
    return { menu: null, recipes: [], packagingTotal: 0, history: [], error: 'Menu tidak ditemukan' }
  }

  const packagingTotal = (packagingRes.data ?? []).reduce((s, p) => s + p.total_cost, 0)

  return {
    menu: menuRes.data,
    recipes: recipesRes.data ?? [],
    packagingTotal,
    history: historyRes.data ?? [],
    error: null,
  }
}

// ---------------------------------------------------------------------------
// runWhatIf (server-side, does NOT save to DB)
// ---------------------------------------------------------------------------
const whatIfSchema = z.object({
  hppBahan: z.string(),
  packagingCost: z.string(),
  overheadCost: z.string(),
  otherCost: z.string(),
  sellingPrice: z.string(),
  materialPriceChangePct: z.coerce.number().optional(),
  sellingPriceChangePct: z.coerce.number().optional(),
  overheadChangePct: z.coerce.number().optional(),
})

export async function runWhatIfServer(
  input: z.infer<typeof whatIfSchema>
): Promise<ActionResult<WhatIfResult>> {
  // No DB write — pure calculation
  await requireRole(['OWNER', 'ADMIN', 'STAFF'])

  const parsed = whatIfSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Input tidak valid' }
  }

  const whatIfInput: WhatIfInput = {
    current: {
      hppBahan: parsed.data.hppBahan,
      packagingCost: parsed.data.packagingCost,
      overheadCost: parsed.data.overheadCost,
      otherCost: parsed.data.otherCost,
      sellingPrice: parsed.data.sellingPrice,
    },
    changes: {
      ...(parsed.data.materialPriceChangePct !== undefined && {
        materialPriceChangePct: parsed.data.materialPriceChangePct,
      }),
      ...(parsed.data.sellingPriceChangePct !== undefined && {
        sellingPriceChangePct: parsed.data.sellingPriceChangePct,
      }),
      ...(parsed.data.overheadChangePct !== undefined && {
        overheadChangePct: parsed.data.overheadChangePct,
      }),
    },
  }

  try {
    const result = runWhatIfSimulation(whatIfInput)
    return { success: true, data: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Simulasi gagal'
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// getSmartPricing — calculate recommended prices for a given HPP
// ---------------------------------------------------------------------------
export async function getSmartPricing(totalHpp: string, targetFoodCostPct: string) {
  try {
    const result = calculatePriceRecommendation({ totalHpp, targetFoodCostPct })
    return { success: true, ...result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kalkulasi gagal'
    return { success: false, error: msg, recommendedPrice: '0', roundedOptions: [] }
  }
}
