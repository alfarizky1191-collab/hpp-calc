'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createMenu, updateMenu } from '@/lib/menus/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tables } from '@/types/database'

type MenuRow = Tables<'menus'>
type CategoryRow = Tables<'categories'>

interface MenuFormProps {
  menu?: MenuRow
  categories: CategoryRow[]
}

type FormState = { success: false; error: string } | { success: true; data: unknown }
const initialState: FormState = { success: false, error: '' }

export function MenuForm({ menu, categories }: MenuFormProps) {
  const router = useRouter()
  const isEdit = Boolean(menu)

  const wrappedAction = async (
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const result = isEdit
      ? await updateMenu(_prev as Parameters<typeof updateMenu>[0], formData)
      : await createMenu(_prev as Parameters<typeof createMenu>[0], formData)
    if (result.success) return { success: true, data: result.data }
    return { success: false, error: result.error }
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState)

  // Controlled category — 'none' when no valid category
  const initialCategoryId =
    menu?.category_id && categories.some((c) => c.id === menu.category_id)
      ? menu.category_id
      : 'none'
  const [categoryId, setCategoryId] = useState(initialCategoryId)

  const MENU_STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', ACTIVE: 'Aktif', INACTIVE: 'Nonaktif' }
  const [menuStatus, setMenuStatus] = useState<string>(menu?.status ?? 'DRAFT')

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? 'Menu berhasil diperbarui' : 'Menu berhasil ditambahkan')
      const data = (state as { success: true; data: unknown }).data as { id?: string } | null
      router.push(data?.id ? `/menus/${data.id}` : '/menus')
    }
  }, [state.success, isEdit, router, state])

  const categoryLabel =
    categoryId === 'none'
      ? '— Tanpa Kategori —'
      : (categories.find((c) => c.id === categoryId)?.name ?? '— Tanpa Kategori —')

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {menu && <input type="hidden" name="id" value={menu.id} />}
      {/* Hidden input carries the actual categoryId value to the server */}
      <input type="hidden" name="categoryId" value={categoryId === 'none' ? '' : categoryId} />

      {!state.success && state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nama Menu <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          name="name"
          defaultValue={menu?.name}
          placeholder="cth: Es Teh Manis, Ayam Geprek"
          required
          disabled={isPending}
        />
      </div>

      {/* Kategori — controlled, display label correctly */}
      <div className="space-y-2">
        <Label>Kategori</Label>
        <Select value={categoryId} onValueChange={(v) => v != null && setCategoryId(v)} disabled={isPending}>
          <SelectTrigger>
            <SelectValue>{categoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Tanpa Kategori —</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sellingPrice">
            Harga Jual (Rp) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            min="0"
            step="any"
            defaultValue={menu?.selling_price}
            placeholder="cth: 15000"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetFoodCost">
            Target Food Cost (%) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="targetFoodCost"
            name="targetFoodCost"
            type="number"
            min="1"
            max="100"
            step="0.01"
            defaultValue={menu?.target_food_cost ?? 30}
            placeholder="cth: 30"
            required
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Persentase HPP bahan terhadap harga jual yang ditargetkan
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Input
          id="description"
          name="description"
          defaultValue={menu?.description ?? ''}
          placeholder="Deskripsi menu (opsional)"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <input type="hidden" name="status" value={menuStatus} />
        <Select value={menuStatus} onValueChange={(v) => v != null && setMenuStatus(v)} disabled={isPending}>
          <SelectTrigger>
            <SelectValue>{MENU_STATUS_LABELS[menuStatus] ?? menuStatus}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="INACTIVE">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Menu'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Batal
        </Button>
      </div>
    </form>
  )
}
