'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/rbac'
import { recipeSchema, recipeItemsSchema } from './schemas'
import { calculateRecipeCost } from '@/lib/hpp'
import type { ActionResult } from '@/types'

// ---------------------------------------------------------------------------
// createRecipe
// ---------------------------------------------------------------------------
export async function createRecipe(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireRole(['OWNER', 'ADMIN'])

  const raw = {
    menuId: formData.get('menuId'),
    version: formData.get('version') ?? '1',
    yieldQuantity: formData.get('yieldQuantity'),
    yieldUnit: formData.get('yieldUnit'),
    notes: formData.get('notes') || null,
    status: formData.get('status') ?? 'DRAFT',
  }

  const parsed = recipeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      menu_id: parsed.data.menuId,
      version: parsed.data.version,
      yield_quantity: parseFloat(parsed.data.yieldQuantity),
      yield_unit: parsed.data.yieldUnit,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Versi resep ini sudah ada untuk menu tersebut.' }
    }
    return { success: false, error: 'Gagal menyimpan resep.' }
  }

  await supabase.rpc('log_audit', {
    p_action: 'CREATE',
    p_entity_type: 'recipe',
    p_entity_id: data.id,
    p_new_value: { menu_id: parsed.data.menuId, version: parsed.data.version },
  })

  revalidatePath(`/menus/${parsed.data.menuId}`)
  revalidatePath('/recipes')
  return { success: true, data: { id: data.id } }
}

// ---------------------------------------------------------------------------
// updateRecipeStatus
// ---------------------------------------------------------------------------
export async function updateRecipeStatus(
  id: string,
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
): Promise<ActionResult> {
  await requireRole(['OWNER', 'ADMIN'])

  const supabase = await createClient()
  const { error } = await supabase
    .from('recipes')
    .update({ status })
    .eq('id', id)

  if (error) return { success: false, error: 'Gagal memperbarui status resep.' }

  revalidatePath('/recipes')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// saveRecipeItems — replace all items for a recipe
// ---------------------------------------------------------------------------
export async function saveRecipeItems(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ totalMaterialCost: string; hppBahanPerUnit: string }>> {
  await requireRole(['OWNER', 'ADMIN'])

  const recipeId = formData.get('recipeId') as string
  const itemsJson = formData.get('items') as string

  let itemsParsed: Array<{ materialId: string; quantity: string; unit: string }>
  try {
    itemsParsed = JSON.parse(itemsJson) as typeof itemsParsed
  } catch {
    return { success: false, error: 'Data bahan tidak valid.' }
  }

  const parsed = recipeItemsSchema.safeParse({ recipeId, items: itemsParsed })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()

  const materialIds = parsed.data.items.map((i) => i.materialId)
  const { data: materials, error: matErr } = await supabase
    .from('materials')
    .select('id, unit_cost, base_unit')
    .in('id', materialIds)
    .is('deleted_at', null)

  if (matErr || !materials) {
    return { success: false, error: 'Gagal mengambil data bahan.' }
  }

  const matMap = new Map(materials.map((m) => [m.id, m]))

  for (const item of parsed.data.items) {
    if (!matMap.has(item.materialId)) {
      return { success: false, error: `Bahan dengan ID ${item.materialId} tidak ditemukan.` }
    }
  }

  const { data: recipe } = await supabase
    .from('recipes')
    .select('yield_quantity')
    .eq('id', recipeId)
    .single()

  if (!recipe) return { success: false, error: 'Resep tidak ditemukan.' }

  const insertRows = parsed.data.items.map((item) => {
    const mat = matMap.get(item.materialId)!
    return {
      recipe_id: recipeId,
      material_id: item.materialId,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      unit_cost_snapshot: mat.unit_cost,
    }
  })

  const { error: delErr } = await supabase
    .from('recipe_items')
    .delete()
    .eq('recipe_id', recipeId)

  if (delErr) return { success: false, error: 'Gagal memperbarui bahan resep.' }

  const { error: insErr } = await supabase.from('recipe_items').insert(insertRows)
  if (insErr) return { success: false, error: 'Gagal menyimpan bahan resep.' }

  const { totalMaterialCost, hppBahanPerUnit } = calculateRecipeCost({
    items: insertRows.map((r) => ({
      materialId: r.material_id,
      quantity: r.quantity.toString(),
      unitCost: r.unit_cost_snapshot.toString(),
    })),
    yieldQuantity: recipe.yield_quantity.toString(),
  })

  revalidatePath(`/recipes/${recipeId}`)
  return { success: true, data: { totalMaterialCost, hppBahanPerUnit } }
}

// ---------------------------------------------------------------------------
// updateRecipe
// ---------------------------------------------------------------------------
export async function updateRecipe(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole(['OWNER', 'ADMIN'])

  const id = formData.get('id') as string
  if (!id) return { success: false, error: 'ID resep tidak valid' }

  const raw = {
    menuId: formData.get('menuId'),
    version: formData.get('version') ?? '1',
    yieldQuantity: formData.get('yieldQuantity'),
    yieldUnit: formData.get('yieldUnit'),
    notes: formData.get('notes') || null,
    status: formData.get('status') ?? 'DRAFT',
  }

  const parsed = recipeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('recipes')
    .update({
      version: parsed.data.version,
      yield_quantity: parseFloat(parsed.data.yieldQuantity),
      yield_unit: parsed.data.yieldUnit,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Versi resep ini sudah ada untuk menu tersebut.' }
    }
    return { success: false, error: 'Gagal memperbarui resep.' }
  }

  await supabase.rpc('log_audit', {
    p_action: 'UPDATE',
    p_entity_type: 'recipe',
    p_entity_id: id,
    p_new_value: { version: parsed.data.version, status: parsed.data.status },
  })

  revalidatePath(`/recipes/${id}`)
  revalidatePath('/recipes')
  if (parsed.data.menuId) revalidatePath(`/menus/${parsed.data.menuId}`)
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// deleteRecipe
// ---------------------------------------------------------------------------
export async function deleteRecipe(id: string): Promise<ActionResult> {
  await requireRole(['OWNER', 'ADMIN'])

  if (!id) return { success: false, error: 'ID tidak valid' }

  const supabase = await createClient()

  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, menu_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return {
        success: false,
        error: 'Resep tidak bisa dihapus karena memiliki riwayat kalkulasi HPP.',
      }
    }
    return { success: false, error: 'Gagal menghapus resep. Coba lagi.' }
  }

  await supabase.rpc('log_audit', {
    p_action: 'DELETE',
    p_entity_type: 'recipe',
    p_entity_id: id,
  })

  revalidatePath('/recipes')
  if (recipe?.menu_id) revalidatePath(`/menus/${recipe.menu_id}`)
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// getRecipes — with optional menu filter
// ---------------------------------------------------------------------------
export async function getRecipes(params?: { menuId?: string; page?: number; pageSize?: number }) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('recipes')
    .select(
      `*, menus!inner(id, name, selling_price, target_food_cost, organization_id)`,
      { count: 'exact' }
    )
    .eq('menus.organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.menuId) {
    query = query.eq('menu_id', params.menuId)
  }

  const { data, count, error } = await query
  if (error) return { data: [], total: 0, error: error.message }
  return { data: data ?? [], total: count ?? 0, error: null }
}

// ---------------------------------------------------------------------------
// getRecipeById — with items + materials
// ---------------------------------------------------------------------------
export async function getRecipeById(id: string) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  // Validate recipe + tenant ownership first.
  const recipeRes = await supabase
    .from('recipes')
    .select(`*, menus!inner(id, name, selling_price, target_food_cost, organization_id)`)
    .eq('id', id)
    .eq('menus.organization_id', profile.organization_id)
    .single()

  if (recipeRes.error || !recipeRes.data) {
    return { recipe: null, items: [], error: 'Resep tidak ditemukan' }
  }

  // Do NOT rely on Supabase's nested relation here. Fetch recipe_items first,
  // then resolve material IDs explicitly. This prevents the UI from receiving
  // a UUID when the PostgREST relationship is not hydrated.
  const itemsRes = await supabase
    .from('recipe_items')
    .select('id, recipe_id, material_id, quantity, unit, unit_cost_snapshot, total_cost, created_at')
    .eq('recipe_id', id)
    .order('created_at')

  if (itemsRes.error) {
    return { recipe: recipeRes.data, items: [], error: 'Gagal mengambil bahan resep' }
  }

  const rawItems = itemsRes.data ?? []
  const materialIds = [...new Set(rawItems.map((item) => item.material_id).filter(Boolean))]

  let materials: Array<{
    id: string
    name: string
    base_unit: string
    unit_cost: number
    purchase_price?: number
  }> = []

  if (materialIds.length > 0) {
    const materialsRes = await supabase
      .from('materials')
      .select('id, name, base_unit, unit_cost, purchase_price, deleted_at')
      .in('id', materialIds)

    if (materialsRes.error) {
      return { recipe: recipeRes.data, items: rawItems, error: null }
    }

    materials = (materialsRes.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      base_unit: m.base_unit,
      unit_cost: m.unit_cost,
      purchase_price: m.purchase_price,
    }))
  }

  const materialMap = new Map(materials.map((material) => [material.id, material]))
  const items = rawItems.map((item) => ({
    ...item,
    // Keep the object shape expected by the recipe UI.
    materials: materialMap.get(item.material_id) ?? null,
  }))

  return {
    recipe: recipeRes.data,
    items,
    error: null,
  }
}
