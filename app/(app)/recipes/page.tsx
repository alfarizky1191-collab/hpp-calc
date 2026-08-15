import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getRecipes } from '@/lib/recipes/actions'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RecipeDeleteButton } from '@/components/recipes/recipe-delete-button'
import { cn } from '@/lib/utils'

interface RecipesPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const [profile, { data: recipes, total }] = await Promise.all([
    getCurrentProfile(),
    getRecipes({ page, pageSize: 20 }),
  ])

  const canEdit = profile?.role === 'OWNER' || profile?.role === 'ADMIN'
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resep</h1>
          <p className="text-muted-foreground text-sm">{total} resep terdaftar</p>
        </div>
        {canEdit && (
          <Link href="/recipes/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4 mr-2" />
            Buat Resep
          </Link>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="font-medium">Belum ada resep</p>
          <p className="text-sm mt-1">Buat resep dari halaman detail menu</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Menu</th>
                <th className="px-4 py-3 text-left font-medium">Versi</th>
                <th className="px-4 py-3 text-left font-medium">Yield</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                {canEdit && <th className="px-4 py-3 text-right font-medium">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe) => {
                const menu = recipe.menus as { id: string; name: string } | null
                return (
                  <tr key={recipe.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {menu ? (
                        <Link href={`/menus/${menu.id}`} className="text-primary hover:underline font-medium">
                          {menu.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/recipes/${recipe.id}`} className="hover:underline font-medium">
                        v{recipe.version}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {recipe.yield_quantity} {recipe.yield_unit}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          recipe.status === 'ACTIVE' ? 'default'
                            : recipe.status === 'DRAFT' ? 'outline'
                            : 'secondary'
                        }
                      >
                        {recipe.status === 'ACTIVE' ? 'Aktif'
                          : recipe.status === 'DRAFT' ? 'Draft'
                          : 'Arsip'}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/recipes/${recipe.id}/edit`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                          >
                            Edit
                          </Link>
                          <RecipeDeleteButton
                            recipeId={recipe.id}
                            recipeName={`Resep v${recipe.version}`}
                            menuName={menu?.name ?? ''}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/recipes?page=${page - 1}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                ← Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/recipes?page=${page + 1}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                Berikutnya →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
