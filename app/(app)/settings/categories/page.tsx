import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/rbac'
import { getCategories } from '@/lib/categories/actions'
import { CategoryManager } from '@/components/settings/category-manager'

export default async function CategoriesSettingsPage() {
  await requireRole(['OWNER', 'ADMIN'])

  const { data: categories } = await getCategories()

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Back nav */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Pengaturan
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Kategori</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kelola kategori untuk bahan baku dan menu. Kategori memudahkan pengelompokan dan
          pencarian data.
        </p>
      </div>

      <CategoryManager initialCategories={categories} />
    </div>
  )
}
