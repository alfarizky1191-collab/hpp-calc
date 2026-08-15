'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

interface DeleteButtonProps {
  /** Label for the item being deleted, shown in confirmation dialog */
  itemName: string
  /** Description shown in the dialog */
  description?: string
  /** Server action to call on confirm */
  onDelete: () => Promise<{ success: boolean; error?: string }>
  /** Where to navigate after successful delete */
  redirectTo?: string
  /** Size variant */
  size?: 'default' | 'sm' | 'icon'
  /** Show only icon (no text) */
  iconOnly?: boolean
}

export function DeleteButton({
  itemName,
  description,
  onDelete,
  redirectTo,
  size = 'default',
  iconOnly = false,
}: DeleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await onDelete()
      if (result.success) {
        toast.success(`"${itemName}" berhasil dihapus`)
        setOpen(false)
        if (redirectTo) {
          router.push(redirectTo)
        } else {
          router.refresh()
        }
      } else {
        toast.error(result.error ?? 'Gagal menghapus. Coba lagi.')
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size={size}
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label={`Hapus ${itemName}`}
      >
        <Trash2 className={iconOnly ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
        {!iconOnly && 'Hapus'}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {itemName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {description ?? `Tindakan ini tidak dapat dibatalkan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
