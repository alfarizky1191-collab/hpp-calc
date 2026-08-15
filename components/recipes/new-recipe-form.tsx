'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createRecipe } from '@/lib/recipes/actions'
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

type MenuOption = Pick<Tables<'menus'>, 'id' | 'name'>

type FormState = { success: false; error: string } | { success: true; data: unknown }
const initialState: FormState = { success: false, error: '' }

interface NewRecipeFormProps {
  menus: MenuOption[]
}

export function NewRecipeForm({ menus }: NewRecipeFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedMenuId = searchParams.get('menuId') ?? ''

  const [selectedMenuId, setSelectedMenuId] = useState(preselectedMenuId)

  const wrappedAction = async (
    _prev: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const result = await createRecipe(_prev as Parameters<typeof createRecipe>[0], formData)
    if (result.success) return { success: true, data: result.data }
    return { success: false, error: result.error }
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState)

  useEffect(() => {
    if (state.success) {
      const successState = state as { success: true; data: unknown }
      const data = successState.data as { id?: string } | null
      toast.success('Resep berhasil dibuat')
      router.push(data?.id ? `/recipes/${data.id}` : '/recipes')
    }
  }, [state.success, state, router])

  const selectedMenuName = menus.find((m) => m.id === selectedMenuId)?.name

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {!state.success && state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="menuId">Menu <span className="text-destructive">*</span></Label>
        <input type="hidden" name="menuId" value={selectedMenuId} />
        <Select value={selectedMenuId} onValueChange={setSelectedMenuId} required>
          <SelectTrigger id="menuId">
            <SelectValue placeholder="Pilih menu...">
              {selectedMenuName ?? 'Pilih menu...'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {menus.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            placeholder="cth: 1"
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
          defaultValue="1"
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
          placeholder="Catatan resep (opsional)"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue="DRAFT">
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Buat Resep'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Batal
        </Button>
      </div>
    </form>
  )
}
