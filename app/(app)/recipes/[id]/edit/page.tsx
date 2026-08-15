import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/rbac'
import { getRecipeById } from '@/lib/recipes/actions'
import { EditRecipeForm } from '@/components/recipes/edit-recipe-form'

interface EditRecipePageProps {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  await requireRole(['OWNER', 'ADMIN'])
  const { id } = await params

  const { recipe, error } = await getRecipeById(id)
  if (error || !recipe) notFound()

  const menu = recipe.menus as { id: string; name: string } | null

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/recipes/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Kembali ke Resep
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Resep</h1>
        <p className="text-muted-foreground text-sm">
          {menu ? `Menu: ${menu.name} · ` : ''}Resep v{recipe.version}
        </p>
      </div>

      <EditRecipeForm recipe={recipe} menuId={menu?.id ?? ''} />
    </div>
  )
}
