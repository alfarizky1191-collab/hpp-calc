'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/rbac'
import type { ActionResult } from '@/types'
import type { Tables, TablesUpdate } from '@/types/database'

export type CategoryRow = Tables<'categories'>

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Nama kategori wajib diisi')
    .max(100, 'Nama terlalu panjang')
    .trim(),
  type: z.enum(['MATERIAL', 'MENU'], {
    errorMap: () => ({ message: 'Tipe harus MATERIAL atau MENU' }),
  }),
})

const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().uuid('ID tidak valid'),
})

// ---------------------------------------------------------------------------
// getCategories
// ---------------------------------------------------------------------------
export async function getCategories(type?: 'MATERIAL' | 'MENU') {
  const profile = await requireRole(['OWNER', 'ADMIN', 'STAFF'])
  const supabase = await createClient()

  let query = supabase
    .from('categories')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('type')
    .order('name')

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

// ---------------------------------------------------------------------------
// createCategory
// ---------------------------------------------------------------------------
export async function createCategory(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const raw = {
    name: formData.get('name'),
    type: formData.get('type'),
  }

  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Input tidak valid',
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .insert({
      organization_id: profile.organization_id,
      name: parsed.data.name,
      type: parsed.data.type,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Kategori dengan nama ini sudah ada.' }
    }
    return { success: false, error: 'Gagal menyimpan kategori. Coba lagi.' }
  }

  revalidatePath('/settings/categories')
  revalidatePath('/materials/new')
  revalidatePath('/menus/new')
  return { success: true, data: { id: data.id } }
}

// ---------------------------------------------------------------------------
// updateCategory
// ---------------------------------------------------------------------------
export async function updateCategory(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  const raw = {
    id: formData.get('id'),
    name: formData.get('name'),
    type: formData.get('type'),
  }

  const parsed = updateCategorySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Input tidak valid',
    }
  }

  const supabase = await createClient()

  const updatePayload: TablesUpdate<'categories'> = {}
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
  if (parsed.data.type !== undefined) updatePayload.type = parsed.data.type

  const { error } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', parsed.data.id)
    .eq('organization_id', profile.organization_id)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Kategori dengan nama ini sudah ada.' }
    }
    return { success: false, error: 'Gagal memperbarui kategori. Coba lagi.' }
  }

  revalidatePath('/settings/categories')
  revalidatePath('/materials/new')
  revalidatePath('/menus/new')
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------
export async function deleteCategory(id: string): Promise<ActionResult> {
  const profile = await requireRole(['OWNER', 'ADMIN'])

  if (!id) return { success: false, error: 'ID tidak valid' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) {
    return { success: false, error: 'Gagal menghapus kategori. Pastikan tidak ada data yang masih menggunakan kategori ini.' }
  }

  revalidatePath('/settings/categories')
  revalidatePath('/materials')
  revalidatePath('/menus')
  return { success: true, data: undefined }
}
