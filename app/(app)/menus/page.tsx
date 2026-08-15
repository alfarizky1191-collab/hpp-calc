import Link from 'next/link'
import { Eye, Plus } from 'lucide-react'
import { getMenus } from '@/lib/menus/actions'
import { getCurrentProfile } from '@/lib/auth/rbac'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MenuDeleteButton } from '@/components/menus/menu-delete-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface MenusPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

function formatRupiah(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v)
}

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline'> = {
  ACTIVE: 'default',
  DRAFT: 'outline',
  INACTIVE: 'secondary',
}

export default async function MenusPage({ searchParams }: MenusPageProps) {
  const params = await searchParams
  const q = params.q ?? ''
  const status = params.status ?? 'all'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const [profile, { data: menus, total }] = await Promise.all([
    getCurrentProfile(),
    getMenus({ q, status, page, pageSize: 20 }),
  ])

  const canEdit = profile?.role === 'OWNER' || profile?.role === 'ADMIN'
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
          <p className="text-muted-foreground text-sm">{total} menu terdaftar</p>
        </div>
        {canEdit && (
          <Link href="/menus/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4 mr-2" />
            Buat Menu
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 flex-wrap">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Cari nama menu..."
          className="w-64"
        />
        <Select name="status" defaultValue={status}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="INACTIVE">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <button type="submit" className={cn(buttonVariants({ variant: 'outline' }))}>
          Filter
        </button>
        {(q || status !== 'all') && (
          <Link href="/menus" className={cn(buttonVariants({ variant: 'ghost' }))}>
            Reset
          </Link>
        )}
      </form>

      {/* Grid cards */}
      {menus.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="font-medium">Belum ada menu</p>
          <p className="text-sm mt-1">Klik &quot;+ Buat Menu&quot; untuk mulai</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <article
              key={menu.id}
              className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/menus/${menu.id}`}
                  className="font-semibold leading-tight text-primary hover:underline"
                >
                  {menu.name}
                </Link>
                <Badge
                  variant={STATUS_BADGE[menu.status] ?? 'outline'}
                  className="shrink-0 text-xs"
                >
                  {menu.status === 'ACTIVE'
                    ? 'Aktif'
                    : menu.status === 'DRAFT'
                      ? 'Draft'
                      : 'Nonaktif'}
                </Badge>
              </div>
              {menu.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {menu.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-primary tabular-nums">
                  {formatRupiah(menu.selling_price)}
                </span>
                <span className="text-muted-foreground text-xs">
                  FC target: {menu.target_food_cost}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Link
                  href={`/menus/${menu.id}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Detail
                </Link>
                {canEdit && (
                  <MenuDeleteButton menuId={menu.id} menuName={menu.name} />
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/menus?q=${q}&status=${status}&page=${page - 1}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                ← Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/menus?q=${q}&status=${status}&page=${page + 1}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Berikutnya →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
