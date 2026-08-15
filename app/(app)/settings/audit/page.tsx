import Link from 'next/link'
import { ChevronLeft, Shield } from 'lucide-react'
import { getAuditLogs, getOrgMembers } from '@/lib/audit/actions'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AuditPageProps {
  searchParams: Promise<{
    action?: string
    entityType?: string
    actorId?: string
    dateFrom?: string
    dateTo?: string
    page?: string
  }>
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  LOGIN_FAILED: 'Login Gagal',
  CREATE: 'Buat',
  UPDATE: 'Ubah',
  DELETE: 'Hapus',
  PRICE_CHANGE: 'Ubah Harga',
  IMPORT: 'Import',
  EXPORT: 'Export',
  ROLE_CHANGE: 'Ubah Role',
  SETTINGS_CHANGE: 'Ubah Pengaturan',
}

const ACTION_VARIANT: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  LOGIN: 'default',
  LOGOUT: 'outline',
  LOGIN_FAILED: 'destructive',
  CREATE: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
  PRICE_CHANGE: 'secondary',
  IMPORT: 'default',
  EXPORT: 'outline',
  ROLE_CHANGE: 'destructive',
  SETTINGS_CHANGE: 'secondary',
}

const ENTITY_TYPES = [
  'material', 'menu', 'recipe', 'expense', 'hpp_calculation',
  'material_import_preview', 'materials', 'report', 'expense',
]

export default async function AuditLogPage({ searchParams }: AuditPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const [{ data: logs, total }, members] = await Promise.all([
    getAuditLogs({
      ...(params.action && params.action !== 'all' ? { action: params.action } : {}),
      ...(params.entityType && params.entityType !== 'all' ? { entityType: params.entityType } : {}),
      ...(params.actorId ? { actorId: params.actorId } : {}),
      ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
      ...(params.dateTo ? { dateTo: params.dateTo } : {}),
      page,
      pageSize: 50,
    }),
    getOrgMembers(),
  ])

  const totalPages = Math.ceil(total / 50)

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams()
    if (params.action) sp.set('action', params.action)
    if (params.entityType) sp.set('entityType', params.entityType)
    if (params.actorId) sp.set('actorId', params.actorId)
    if (params.dateFrom) sp.set('dateFrom', params.dateFrom)
    if (params.dateTo) sp.set('dateTo', params.dateTo)
    sp.set('page', p.toString())
    return `/settings/audit?${sp.toString()}`
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Pengaturan
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-muted-foreground text-sm">
              {total.toLocaleString('id-ID')} entri log aktivitas
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        {/* Action filter */}
        <Select name="action" defaultValue={params.action ?? 'all'}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aksi</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Entity type filter */}
        <Select name="entityType" defaultValue={params.entityType ?? 'all'}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Entitas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Entitas</SelectItem>
            {ENTITY_TYPES.map((et) => (
              <SelectItem key={et} value={et}>{et}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Actor filter */}
        {members.length > 1 && (
          <Select name="actorId" defaultValue={params.actorId ?? 'all'}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua Pengguna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pengguna</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name ?? m.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date range */}
        <Input
          name="dateFrom"
          type="date"
          defaultValue={params.dateFrom ?? ''}
          className="w-36 h-8 text-sm"
          placeholder="Dari tanggal"
        />
        <Input
          name="dateTo"
          type="date"
          defaultValue={params.dateTo ?? ''}
          className="w-36 h-8 text-sm"
          placeholder="Sampai tanggal"
        />

        <button type="submit" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          Filter
        </button>
        <Link href="/settings/audit" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          Reset
        </Link>
      </form>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="font-medium">Tidak ada log ditemukan</p>
          <p className="text-sm mt-1">Coba ubah filter atau reset</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Waktu</th>
                <th className="px-4 py-3 text-left font-medium">Pengguna</th>
                <th className="px-4 py-3 text-left font-medium">Aksi</th>
                <th className="px-4 py-3 text-left font-medium">Entitas</th>
                <th className="px-4 py-3 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actor = (log.profiles as unknown) as { full_name: string | null; role: string } | null
                const metadata = log.metadata as Record<string, unknown> | null
                const newVal = log.new_value as Record<string, unknown> | null

                // Build detail hint from new_value or metadata
                const detailHint = newVal?.name
                  ?? newVal?.total_hpp
                  ?? metadata?.filename
                  ?? metadata?.imported_count
                  ?? metadata?.type
                  ?? null

                return (
                  <tr key={log.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Intl.DateTimeFormat('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(log.created_at))}
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-medium text-xs">
                        {actor?.full_name ?? log.actor_id?.slice(0, 8) ?? 'System'}
                      </p>
                      {actor?.role && (
                        <p className="text-xs text-muted-foreground">{actor.role}</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={ACTION_VARIANT[log.action] ?? 'outline'}
                        className="text-xs"
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {log.entity_type && (
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                          {log.entity_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-48 truncate">
                      {detailHint !== null && detailHint !== undefined
                        ? String(detailHint)
                        : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildPageUrl(page - 1)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                ← Sebelumnya
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildPageUrl(page + 1)}
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
