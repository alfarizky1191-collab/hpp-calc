import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getRecipeById, deleteRecipe } from '@/lib/recipes/actions'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { createClient } from '@/lib/supabase/server'
import { IngredientBuilder } from '@/components/recipes/ingredient-builder'
import { DeleteButton } from '@/components/ui/delete-button'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params

  const [profile, { recipe, items, error }] = await Promise.all([
    getCurrentProfile(),
    getRecipeById(id),
  ])

  if (error || !recipe) notFound()

  const menu = recipe.menus as {
    id: string
    name: string
    selling_price: number
    target_food_cost: number
  } | null

  const canEdit = profile?.role === 'OWNER' || profile?.role === 'ADMIN'

  async function handleDelete() {
    'use server'
    return await deleteRecipe(recipe!.id)
  }

  // Fetch all non-deleted materials for the ingredient builder
  // Include INACTIVE so existing recipe items that reference them still resolve by name
  const supabase = await createClient()
  const { data: materialsRaw } = await supabase
    .from('materials')
    .select('id, name, base_unit, unit_cost')
    .is('deleted_at', null)
    .order('name')

  // Merge materials from query + materials already in recipe items (in case some are not returned by query)
  const materialMap = new Map<string, { id: string; name: string; base_unit: string; unit_cost: number }>()
  for (const m of (materialsRaw ?? [])) {
    materialMap.set(m.id, m)
  }
  for (const item of items) {
    const mat = item.materials as { id: string; name: string; base_unit: string; unit_cost: number } | null
    if (mat && !materialMap.has(mat.id)) {
      materialMap.set(mat.id, mat)
    }
  }
  const materials = Array.from(materialMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const initialItems = items.map((item) => ({
    material_id: item.material_id,
    quantity: item.quantity,
    unit: item.unit,
  }))

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <div>
        {menu && (
          <Link
            href={`/menus/${menu.id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {menu.name}
          </Link>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                Resep v{recipe.version}
              </h1>
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
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Yield: {recipe.yield_quantity} {recipe.yield_unit}
              {recipe.notes && ` · ${recipe.notes}`}
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <Link
                href={`/recipes/${recipe.id}/edit`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Edit Resep
              </Link>
              {recipe.status !== 'ACTIVE' && (
                <Link
                  href={`/recipes/${recipe.id}/activate`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Jadikan Aktif
                </Link>
              )}
              <DeleteButton
                itemName={`Resep v${recipe.version}`}
                description="Resep dan semua bahan di dalamnya akan dihapus permanen."
                onDelete={handleDelete}
                redirectTo={menu ? `/menus/${menu.id}` : '/recipes'}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Menu info */}
      {menu && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Harga Jual</p>
            <p className="font-bold tabular-nums mt-0.5">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(menu.selling_price)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Target FC</p>
            <p className="font-bold tabular-nums mt-0.5">{menu.target_food_cost}%</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Jumlah Bahan</p>
            <p className="font-bold tabular-nums mt-0.5">{items.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Yield</p>
            <p className="font-bold tabular-nums mt-0.5">
              {recipe.yield_quantity} {recipe.yield_unit}
            </p>
          </div>
        </div>
      )}

      {/* Ingredient Builder */}
      <section>
        <h2 className="font-semibold text-lg mb-4">Bahan-Bahan</h2>
        {canEdit ? (
          <IngredientBuilder
            recipeId={recipe.id}
            yieldQuantity={recipe.yield_quantity}
            initialItems={initialItems}
            materials={materials}
            sellingPrice={menu?.selling_price ?? 0}
            targetFoodCost={menu?.target_food_cost ?? 30}
          />
        ) : (
          /* Read-only view for Staff */
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Bahan</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-left font-medium">Satuan</th>
                  <th className="px-4 py-3 text-right font-medium">Cost Snapshot</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const mat = item.materials as { name: string } | null
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{mat?.name ?? '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-4 py-2">{item.unit}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 2,
                        }).format(item.unit_cost_snapshot)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(item.total_cost)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
