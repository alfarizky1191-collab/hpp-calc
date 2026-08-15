'use client'

import { deleteRecipe } from '@/lib/recipes/actions'
import { DeleteButton } from '@/components/ui/delete-button'

interface RecipeDeleteButtonProps {
  recipeId: string
  recipeName: string
  menuName?: string
}

export function RecipeDeleteButton({
  recipeId,
  recipeName,
  menuName,
}: RecipeDeleteButtonProps) {
  return (
    <DeleteButton
      itemName={recipeName}
      description={`Resep${menuName ? ` untuk ${menuName}` : ''} dan semua bahan di dalamnya akan dihapus permanen.`}
      onDelete={() => deleteRecipe(recipeId)}
      size="sm"
    />
  )
}
