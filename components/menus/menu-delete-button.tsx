'use client'

import { deleteMenu } from '@/lib/menus/actions'
import { DeleteButton } from '@/components/ui/delete-button'

interface MenuDeleteButtonProps {
  menuId: string
  menuName: string
}

export function MenuDeleteButton({ menuId, menuName }: MenuDeleteButtonProps) {
  return (
    <DeleteButton
      itemName={menuName}
      description="Menu, resep, dan biaya kemasan terkait akan dihapus permanen."
      onDelete={() => deleteMenu(menuId)}
      size="sm"
    />
  )
}
