'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteExpense } from '@/lib/expenses/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface ExpenseActionsProps {
  id: string
  name: string
}

export function ExpenseActions({ id, name }: ExpenseActionsProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpense(id)
      if (result.success) {
        toast.success(`Biaya "${name}" berhasil dihapus`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => router.push(`/expenses/${id}/edit`)}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        title="Hapus"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Confirm delete dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Biaya?</AlertDialogTitle>
            <AlertDialogDescription>
              Biaya <strong>{name}</strong> akan dihapus permanen. Tindakan ini
              tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setConfirmOpen(false)
                handleDelete()
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
