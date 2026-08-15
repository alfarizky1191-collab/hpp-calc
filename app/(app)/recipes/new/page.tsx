import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/rbac'
import { createClient } from '@/lib/supabase/server'
import { NewRecipeForm } from '@/components/recipes/new-recipe-form'

export default async function NewRecipePage() {
  await requireRole(['OWNER', 'ADMIN'])
  const supabase = await createClient()

  const { data: menus } = await supabase
    .from('menus')
    .select('id, name')
    .eq('status', 'ACTIVE')
    .order('name')

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <Link
          href="/recipes"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Kembali ke Resep
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Buat Resep</h1>
        <p className="text-muted-foreground text-sm">
          Setelah resep dibuat, tambahkan bahan-bahan di halaman detail resep
        </p>
      </div>
      <Suspense fallback={null}>
        <NewRecipeForm menus={menus ?? []} />
      </Suspense>
    </div>
  )
}
