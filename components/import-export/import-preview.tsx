'use client'

import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { ParsedImportRow, ImportSummary } from '@/lib/excel/import'

interface ImportPreviewProps {
  rows: ParsedImportRow[]
  summary: ImportSummary
  onConfirm: () => void
  onCancel: () => void
  isImporting: boolean
}

const STATUS_CONFIG = {
  valid: {
    icon: CheckCircle2,
    className: 'text-green-600',
    rowClass: '',
    badge: { variant: 'default' as const, label: 'Valid' },
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-amber-500',
    rowClass: 'bg-amber-50/50',
    badge: { variant: 'outline' as const, label: 'Peringatan' },
  },
  error: {
    icon: XCircle,
    className: 'text-destructive',
    rowClass: 'bg-red-50/50',
    badge: { variant: 'destructive' as const, label: 'Error' },
  },
}

function RowDetail({ row }: { row: ParsedImportRow }) {
  const [open, setOpen] = useState(false)
  const config = STATUS_CONFIG[row.status]
  const Icon = config.icon
  const data = row.data

  return (
    <div className={`border-b last:border-b-0 ${config.rowClass}`}>
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30"
        onClick={() => setOpen((p) => !p)}
      >
        <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">
          {row.rowIndex}
        </span>
        <Icon className={`h-4 w-4 shrink-0 ${config.className}`} />
        <span className="text-sm font-medium flex-1 truncate">
          {data?.['Nama Bahan'] ?? (row.raw['Nama Bahan'] as string | null) ?? '(kosong)'}
        </span>
        {row.errors.length > 0 || row.warnings.length > 0 ? (
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {row.errors.length > 0 && (
              <span className="text-destructive">{row.errors.length} error</span>
            )}
            {row.warnings.length > 0 && row.errors.length > 0 && ' · '}
            {row.warnings.length > 0 && (
              <span className="text-amber-600">{row.warnings.length} peringatan</span>
            )}
          </span>
        ) : null}
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </div>

      {open && (
        <div className="px-4 pb-3 pt-1 space-y-2 ml-11 text-sm">
          {/* Errors */}
          {row.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-destructive">
              <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="text-xs">{e}</span>
            </div>
          ))}
          {/* Warnings */}
          {row.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="text-xs">{w}</span>
            </div>
          ))}
          {/* Preview data */}
          {data && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground mt-2 pt-2 border-t">
              <span>Satuan Beli: <span className="text-foreground">{data['Satuan Pembelian']}</span></span>
              <span>Harga: <span className="text-foreground">Rp{data['Harga Pembelian (Rp)'].toLocaleString('id-ID')}</span></span>
              <span>Isi Kemasan: <span className="text-foreground">{data['Isi Per Kemasan']} {data['Satuan Terkecil']}</span></span>
              {data.Supplier && <span>Supplier: <span className="text-foreground">{data.Supplier}</span></span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ImportPreview({
  rows,
  summary,
  onConfirm,
  onCancel,
  isImporting,
}: ImportPreviewProps) {
  const [filter, setFilter] = useState<'all' | 'valid' | 'warning' | 'error'>('all')

  const filteredRows = filter === 'all' ? rows : rows.filter((r) => r.status === filter)
  const canImport = summary.valid + summary.warning > 0

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            filter === 'all' ? 'bg-muted' : 'hover:bg-muted/50'
          }`}
        >
          <span className="font-medium">{summary.total}</span>
          <span className="text-muted-foreground">total</span>
        </button>
        <button
          onClick={() => setFilter('valid')}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            filter === 'valid' ? 'bg-green-50 border-green-200' : 'hover:bg-muted/50'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-700">{summary.valid}</span>
          <span className="text-muted-foreground">valid</span>
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            filter === 'warning' ? 'bg-amber-50 border-amber-200' : 'hover:bg-muted/50'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="font-medium text-amber-700">{summary.warning}</span>
          <span className="text-muted-foreground">peringatan</span>
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            filter === 'error' ? 'bg-red-50 border-red-200' : 'hover:bg-muted/50'
          }`}
        >
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="font-medium text-destructive">{summary.error}</span>
          <span className="text-muted-foreground">error</span>
        </button>
      </div>

      {summary.error > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {summary.error} baris memiliki error dan akan dilewati saat import.
          {canImport && ' Baris valid dan dengan peringatan akan tetap diimport.'}
        </div>
      )}

      {/* Row list */}
      <div className="rounded-lg border overflow-hidden max-h-96 overflow-y-auto">
        {filteredRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Tidak ada baris dengan status ini
          </div>
        ) : (
          filteredRows.map((row) => <RowDetail key={row.rowIndex} row={row} />)
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canImport || isImporting}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isImporting
            ? 'Mengimport...'
            : `Import ${summary.valid + summary.warning} Bahan`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isImporting}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          Batal
        </button>
        {!canImport && (
          <span className="text-sm text-destructive">
            Tidak ada baris yang bisa diimport
          </span>
        )}
      </div>
    </div>
  )
}
