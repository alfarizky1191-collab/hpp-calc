import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Pencil, Plus } from 'lucide-react'
import { getMenuById, deleteMenu } from '@/lib/menus/actions'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { PackagingCostManager } from '@/components/menus/packaging-cost-manager'
import { RecipeDeleteButton } from '@/components/recipes/recipe-delete-button'
import { DeleteButton } from '@/components/ui/delete-button'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MenuDetailPageProps {
  params: Promise<{ id: string }>
}

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

export default async function MenuDetailPage({ params }: MenuDetailPageProps) {
  const { id } = await params
  const [profile, { menu, packaging, recipes, error }] = await Promise.all([
    getCurrentProfile(),
    getMenuById(id),
  ])

  if (error || !menu) notFound()

  const canEdit = profile?.role === 'OWNER' || profile?.role === 'ADMIN'
  const activeRecipe = recipes.find((r) => r.status === 'ACTIVE')

  async function handleDelete() {
    'use server'
    return await deleteMenu(menu.id)
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href="/menus"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Menu
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{menu.name}</h1>
              <Badge
                variant={
                  menu.status === 'ACTIVE'
                    ? 'default'
                    : menu.status === 'DRAFT'
                      ? 'outline'
                      : 'secondary'
                }
              >
                {menu.status === 'ACTIVE'
                  ? 'Aktif'
                  : menu.status === 'DRAFT'
                    ? 'Draft'
                    : 'Nonaktif'}
              </Badge>
            </div>
            {menu.description && (
              <p className="text-muted-foreground text-sm mt-1">{menu.description}</p>
            )}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Link
                href={`/menus/${menu.id}/edit`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Menu
              </Link>
              <DeleteButton
                itemName={menu.name}
                description="Menu, resep, dan biaya kemasan terkait akan dihapus permanen."
                onDelete={handleDelete}
                redirectTo="/menus"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Harga Jual</p>
          <p className="text-xl font-bold tabular-nums mt-1">
            {formatRupiah(menu.selling_price)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Target Food Cost</p>
          <p className="text-xl font-bold tabular-nums mt-1">
            {menu.target_food_cost}%
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Versi Resep</p>
          <p className="text-xl font-bold tabular-nums mt-1">{recipes.length}</p>
        </div>
      </div>

      {/* Packaging Costs */}
      <section>
        <h2 className="font-semibold text-lg mb-4">Biaya Kemasan</h2>
        <PackagingCostManager
          menuId={menu.id}
          initialItems={packaging}
          canEdit={canEdit}
        />
      </section>

      {/* Recipes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Resep</h2>
          {canEdit && (
            <Link
              href={`/recipes/new?menuId=${menu.id}`}
              className={cn(buttonVariants({ size: 'sm' }))}
            >
              <Plus className="h-4 w-4 mr-1" />
              Buat Resep
            </Link>
          )}
        </div>

        {recipes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="font-medium">Belum ada resep</p>
            <p className="text-sm mt-1">Buat resep untuk mulai hitung HPP</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <article
                key={recipe.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    v{recipe.version}
                  </div>
                  <div>
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Resep v{recipe.version}
                      {recipe.id === activeRecipe?.id && (
                        <span className="ml-2 text-xs text-green-600 font-normal">● Aktif</span>
                      )}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Yield: {recipe.yield_quantity} {recipe.yield_unit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      recipe.status === 'ACTIVE'
                        ? 'default'
                        : recipe.status === 'DRAFT'
                          ? 'outline'
                          : 'secondary'
                    }
                  >
                    {recipe.status === 'ACTIVE'
                      ? 'Aktif'
                      : recipe.status === 'DRAFT'
                        ? 'Draft'
                        : 'Arsip'}
                  </Badge>
                  {canEdit && (
                    <RecipeDeleteButton
                      recipeId={recipe.id}
                      recipeName={`Resep v${recipe.version}`}
                      menuName={menu.name}
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
