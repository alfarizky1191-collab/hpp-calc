'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/rbac'
import {
  menuSchema,
  updateMenuSchema,
  packagingCostSchema,
  updatePackagingCostSchema,
} from './schemas'
import type { ActionResult } from '@/types'
import type { Tables } from '@/types/database'

export type MenuRow = Tables<'menus'>

// ---------------------------------------------------------------------------
// createMenu
// ---------------------------------------------------------------------------
export async function createMenu(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const rawMenuCategoryId = formData.get('categoryId')
  const raw = {
    name: formData.get('name'),
    // 'none' is the placeholder value from the Select component; treat as null
    categoryId: rawMenuCategoryId && rawMenuCategoryId !== 'none' ? rawMenuCategoryId : null,
    description: formData.get('description') || null,
    sellingPrice: formData.get('sellingPrice'),
    targetFoodCost: formData.get('targetFoodCost') ?? '30',
    status: formData.get('status') ?? 'DRAFT',
  }

  const parsed = menuSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menus')
    .insert({
      organization_id: profile.organization_id,
      name: parsed.data.name,
      category_id: parsed.data.categoryId ?? null,
      description: parsed.data.description ?? null,
      selling_price: parseFloat(parsed.data.sellingPrice),
      target_food_cost: parseFloat(parsed.data.targetFoodCost),
      status: parsed.data.status,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: 'Gagal menyimpan menu.' }

  await supabase.rpc('log_audit', {
    p_action: 'CREATE',
    p_entity_type: 'menu',
    p_entity_id: data.id,
    p_new_value: { name: parsed.data.name },
  })

  revalidatePath('/menus')
  return { success: true, data: { id: data.id } }
}

// ---------------------------------------------------------------------------
// updateMenu
// ---------------------------------------------------------------------------
export async function updateMenu(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const rawUpdateMenuCategoryId = formData.get('categoryId')
  const raw = {
    id: formData.get('id'),
    name: formData.get('name'),
    // 'none' is the placeholder value from the Select component; treat as null
    categoryId: rawUpdateMenuCategoryId && rawUpdateMenuCategoryId !== 'none' ? rawUpdateMenuCategoryId : null,
    description: formData.get('description') || null,
    sellingPrice: formData.get('sellingPrice'),
    targetFoodCost: formData.get('targetFoodCost'),
    status: formData.get('status'),
  }

  const parsed = updateMenuSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()

  const updatePayload: Record<string, string | number | null> = {}
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
  if (parsed.data.categoryId !== undefined) updatePayload.category_id = parsed.data.categoryId
  if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description
  if (parsed.data.sellingPrice !== undefined) updatePayload.selling_price = parseFloat(parsed.data.sellingPrice)
  if (parsed.data.targetFoodCost !== undefined) updatePayload.target_food_cost = parseFloat(parsed.data.targetFoodCost)
  if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status

  const { error } = await supabase
    .from('menus')
    .update(updatePayload)
    .eq('id', parsed.data.id)
    .eq('organization_id', profile.organization_id)

  if (error) return { success: false, error: 'Gagal memperbarui menu.' }

  await supabase.rpc('log_audit', {
    p_action: 'UPDATE',
    p_entity_type: 'menu',
    p_entity_id: parsed.data.id,
    p_new_value: updatePayload,
  })

  revalidatePath('/menus')
  revalidatePath(`/menus/${parsed.data.id}`)
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// deleteMenu
// ---------------------------------------------------------------------------
export async function deleteMenu(id: string): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const supabase = await createClient()
  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) return { success: false, error: 'Gagal menghapus menu.' }

  await supabase.rpc('log_audit', {
    p_action: 'DELETE',
    p_entity_type: 'menu',
    p_entity_id: id,
  })

  revalidatePath('/menus')
  revalidatePath('/recipes')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// getMenus
// ---------------------------------------------------------------------------
export async function getMenus(params?: {
  q?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('menus')
    .select('*, categories(name)', { count: 'exact' })
    .eq('organization_id', profile.organization_id)
    .order('name')
    .range(from, to)

  if (params?.status && params.status !== 'all') {
    const validStatus = ['ACTIVE', 'INACTIVE', 'DRAFT'] as const
    if (validStatus.includes(params.status as (typeof validStatus)[number])) {
      query = query.eq('status', params.status as (typeof validStatus)[number])
    }
  }
  if (params?.q) {
    query = query.ilike('name', `%${params.q}%`)
  }

  const { data, count, error } = await query
  if (error) return { data: [], total: 0, error: error.message }
  return { data: data ?? [], total: count ?? 0, error: null }
}

// ---------------------------------------------------------------------------
// getMenuById
// ---------------------------------------------------------------------------
export async function getMenuById(id: string) {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  const [menuRes, packagingRes, recipesRes] = await Promise.all([
    supabase
      .from('menus')
      .select('*, categories(name)')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single(),
    supabase
      .from('packaging_costs')
      .select('*')
      .eq('menu_id', id)
      .order('name'),
    supabase
      .from('recipes')
      .select('*')
      .eq('menu_id', id)
      .order('version', { ascending: false }),
  ])

  if (menuRes.error || !menuRes.data) return { menu: null, packaging: [], recipes: [], error: 'Menu tidak ditemukan' }

  return {
    menu: menuRes.data,
    packaging: packagingRes.data ?? [],
    recipes: recipesRes.data ?? [],
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Packaging cost actions
// ---------------------------------------------------------------------------
export async function upsertPackagingCost(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole(['OWNER', 'ADMIN'])

  const id = formData.get('id') as string | null

  const raw = {
    menuId: formData.get('menuId'),
    name: formData.get('name'),
    quantity: formData.get('quantity') ?? '1',
    unitCost: formData.get('unitCost'),
  }

  const parsed = id
    ? updatePackagingCostSchema.safeParse({ ...raw, id })
    : packagingCostSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Input tidak valid' }
  }

  const supabase = await createClient()

  if (id) {
    const d = parsed.data as typeof parsed.data & { id: string }
    const { error } = await supabase
      .from('packaging_costs')
      .update({
        name: d.name ?? '',
        quantity: parseFloat(d.quantity ?? '1'),
        unit_cost: parseFloat(d.unitCost ?? '0'),
      })
      .eq('id', d.id)
    if (error) return { success: false, error: 'Gagal memperbarui kemasan.' }
  } else {
    const d = parsed.data as z.infer<typeof packagingCostSchema>
    const { error } = await supabase
      .from('packaging_costs')
      .insert({
        menu_id: d.menuId,
        name: d.name,
        quantity: parseFloat(d.quantity),
        unit_cost: parseFloat(d.unitCost),
      })
    if (error) return { success: false, error: 'Gagal menambahkan kemasan.' }
  }

  revalidatePath(`/menus/${(parsed.data as { menuId?: string }).menuId ?? ''}`)
  return { success: true, data: undefined }
}

export async function deletePackagingCost(id: string, menuId: string): Promise<ActionResult> {
  await requireRole(['OWNER', 'ADMIN'])

  const supabase = await createClient()
  const { error } = await supabase.from('packaging_costs').delete().eq('id', id)

  if (error) return { success: false, error: 'Gagal menghapus kemasan.' }

  revalidatePath(`/menus/${menuId}`)
  return { success: true, data: undefined }
}
