'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateRecipe } from '@/lib/recipes/actions'
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

type RecipeRow = Tables<'recipes'>

type FormState = { success: false; error: string } | { success: true; data: unknown }
const initialState: FormState = { success: false, error: '' }

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  DRAFT: 'Draft',
  ARCHIVED: 'Arsip',
}

interface EditRecipeFormProps {
  recipe: RecipeRow
  menuId: string
}

export function EditRecipeForm({ recipe, menuId }: EditRecipeFormProps) {
  const router = useRouter()

  const [status, setStatus] = useState<string>(recipe.status)

  const wrappedAction = async (
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const result = await updateRecipe(_prev as Parameters<typeof updateRecipe>[0], formData)
    if (result.success) return { success: true, data: undefined }
    return { success: false, error: result.error }
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState)

  useEffect(() => {
    if (state.success) {
      toast.success('Resep berhasil diperbarui')
      router.push(`/recipes/${recipe.id}`)
    }
  }, [state.success, recipe.id, router])

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <input type="hidden" name="id" value={recipe.id} />
      <input type="hidden" name="menuId" value={menuId} />
      <input type="hidden" name="status" value={status} />

      {!state.success && state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="yieldQuantity">
            Yield (Porsi/Jumlah) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="yieldQuantity"
            name="yieldQuantity"
            type="number"
            min="0.01"
            step="any"
            defaultValue={recipe.yield_quantity}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yieldUnit">
            Satuan Yield <span className="text-destructive">*</span>
          </Label>
          <Input
            id="yieldUnit"
            name="yieldUnit"
            defaultValue={recipe.yield_unit}
            placeholder="cth: porsi, cup, pcs"
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="version">Versi</Label>
        <Input
          id="version"
          name="version"
          type="number"
          min="1"
          defaultValue={recipe.version}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Nomor versi resep. Angka lebih besar = versi lebih baru.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Input
          id="notes"
          name="notes"
          defaultValue={recipe.notes ?? ''}
          placeholder="Catatan resep (opsional)"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => v != null && setStatus(v)} disabled={isPending}>
          <SelectTrigger>
            <SelectValue>{STATUS_LABELS[status] ?? status}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="ARCHIVED">Arsip</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
