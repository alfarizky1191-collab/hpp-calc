'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Tag } from 'lucide-react'
import { createCategory, updateCategory, deleteCategory } from '@/lib/categories/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Tables } from '@/types/database'

type CategoryRow = Tables<'categories'>
type FormState = { success: false; error: string } | { success: true; data: unknown }
const initialState: FormState = { success: false, error: '' }

// ---------------------------------------------------------------------------
// Add / Edit dialog
// ---------------------------------------------------------------------------
function CategoryDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: CategoryRow | null
}) {
  const isEdit = Boolean(editing)

  const action = async (_prev: FormState, formData: FormData): Promise<FormState> => {
    const result = isEdit
      ? await updateCategory(_prev as Parameters<typeof updateCategory>[0], formData)
      : await createCategory(_prev as Parameters<typeof createCategory>[0], formData)
    if (result.success) return { success: true, data: result.data }
    return { success: false, error: result.error }
  }

  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? 'Kategori diperbarui' : 'Kategori ditambahkan')
      onClose()
    }
  }, [state.success, isEdit, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}

          {!state.success && state.error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="catName">
              Nama Kategori <span className="text-destructive">*</span>
            </Label>
            <Input
              id="catName"
              name="name"
              defaultValue={editing?.name ?? ''}
              placeholder="cth: Makanan, Minuman"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catType">
              Tipe <span className="text-destructive">*</span>
            </Label>
            <Select name="type" defaultValue={editing?.type ?? 'MATERIAL'} disabled={isPending}>
              <SelectTrigger id="catType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MATERIAL">Bahan (Material)</SelectItem>
                <SelectItem value="MENU">Menu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Delete confirm dialog
// ---------------------------------------------------------------------------
function DeleteDialog({
  category,
  onClose,
}: {
  category: CategoryRow | null
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!category) return
    startTransition(async () => {
      const result = await deleteCategory(category.id)
      if (result.success) {
        toast.success('Kategori dihapus')
        onClose()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={Boolean(category)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus Kategori?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Kategori <span className="font-semibold">{category?.name}</span> akan dihapus permanen.
          Bahan atau menu yang menggunakan kategori ini tidak akan terhapus, namun kategorinya
          akan kosong.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Menghapus...' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CategoryManager({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [deleting, setDeleting] = useState<CategoryRow | null>(null)

  const materialCategories = initialCategories.filter((c) => c.type === 'MATERIAL')
  const menuCategories = initialCategories.filter((c) => c.type === 'MENU')

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(cat: CategoryRow) {
    setEditing(cat)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Kategori</h2>
            <p className="text-sm text-muted-foreground">
              Kelola kategori untuk bahan dan menu
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah Kategori
        </Button>
      </div>

      {/* Material categories */}
      <CategorySection
        title="Kategori Bahan"
        categories={materialCategories}
        onEdit={openEdit}
        onDelete={setDeleting}
        badgeVariant="secondary"
      />

      {/* Menu categories */}
      <CategorySection
        title="Kategori Menu"
        categories={menuCategories}
        onEdit={openEdit}
        onDelete={setDeleting}
        badgeVariant="default"
      />

      {/* Dialogs */}
      <CategoryDialog
        open={dialogOpen}
        onClose={closeDialog}
        editing={editing}
      />
      <DeleteDialog
        category={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

function CategorySection({
  title,
  categories,
  onEdit,
  onDelete,
  badgeVariant,
}: {
  title: string
  categories: CategoryRow[]
  onEdit: (cat: CategoryRow) => void
  onDelete: (cat: CategoryRow) => void
  badgeVariant: 'default' | 'secondary'
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada kategori. Tambahkan kategori baru.
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant={badgeVariant} className="text-xs">
                  {cat.type === 'MATERIAL' ? 'Bahan' : 'Menu'}
                </Badge>
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onEdit(cat)}
                  aria-label={`Edit ${cat.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(cat)}
                  aria-label={`Hapus ${cat.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
