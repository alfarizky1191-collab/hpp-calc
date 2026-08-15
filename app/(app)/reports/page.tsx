'use client'

import { useState, useRef, useTransition } from 'react'
import {
  FileDown,
  FileUp,
  FileSpreadsheet,
  Package,
  UtensilsCrossed,
  BarChart3,
  TrendingUp,
  Download,
} from 'lucide-react'
import { ImportPreview } from '@/components/import-export/import-preview'
import { toast } from 'sonner'
import type { ParsedImportRow, ImportSummary } from '@/lib/excel/import'

// ---------------------------------------------------------------------------
// Export button component
// ---------------------------------------------------------------------------
interface ExportButtonProps {
  type: string
  label: string
  description: string
  icon: React.ElementType
  disabled?: boolean
}

function ExportButton({ type, label, description, icon: Icon, disabled }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/export?type=${type}`)
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        toast.error(err.error ?? 'Export gagal')
        return
      }
      // Trigger download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hpp-manager-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${label} berhasil diexport`)
    } catch {
      toast.error('Terjadi kesalahan saat export')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading || disabled}
      className="flex items-start gap-4 rounded-lg border bg-card p-4 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed w-full"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {loading ? (
        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0 mt-1" />
      ) : (
        <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Import section
// ---------------------------------------------------------------------------
type ImportPhase = 'idle' | 'uploading' | 'preview' | 'done'

interface PreviewData {
  rows: ParsedImportRow[]
  summary: ImportSummary
  totalRows: number
}

function ImportSection() {
  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPhase('uploading')

    const formData = new FormData()
    formData.set('file', file)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json() as PreviewData & { error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Gagal memproses file')
        setPhase('idle')
        return
      }

      setPreviewData(data)
      setPhase('preview')
    } catch {
      toast.error('Gagal menghubungi server')
      setPhase('idle')
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleConfirm() {
    if (!previewData) return

    // Send only valid + warning rows to confirm endpoint
    const validRows = previewData.rows
      .filter((r) => r.status !== 'error' && r.data !== null)
      .map((r) => r.data!)

    startTransition(async () => {
      try {
        const res = await fetch('/api/import/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: validRows }),
        })

        const data = await res.json() as { success?: boolean; imported?: number; error?: string }

        if (!res.ok || !data.success) {
          toast.error(data.error ?? 'Import gagal')
          return
        }

        toast.success(`${data.imported} bahan berhasil diimport!`)
        setPhase('done')
        setPreviewData(null)
      } catch {
        toast.error('Gagal menghubungi server')
      }
    })
  }

  function handleReset() {
    setPhase('idle')
    setPreviewData(null)
  }

  async function handleDownloadTemplate() {
    try {
      const res = await fetch('/api/export?type=materials-template')
      if (!res.ok) {
        // Fall back to generating client-side placeholder message
        toast.error('Template belum tersedia. Download template dari tombol Export > Master Bahan.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template-import-bahan.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gagal download template')
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <FileUp className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold">Import Master Bahan</p>
          <p className="text-xs text-muted-foreground">
            Upload file Excel (.xlsx) untuk import bahan baku secara massal
          </p>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-dashed p-6 text-center space-y-3">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-medium">Pilih file Excel</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                .xlsx atau .xls · Maksimal 10 MB · Maksimal 1.000 baris
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors"
            >
              <FileUp className="h-4 w-4" />
              Pilih File
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Kolom wajib: Nama Bahan, Satuan Pembelian, Harga Pembelian (Rp), Isi Per Kemasan, Satuan Terkecil</span>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 text-xs text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            Download template Excel
          </button>
        </div>
      )}

      {phase === 'uploading' && (
        <div className="flex items-center gap-3 py-4">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memproses file...</p>
        </div>
      )}

      {phase === 'preview' && previewData && (
        <ImportPreview
          rows={previewData.rows}
          summary={previewData.summary}
          onConfirm={handleConfirm}
          onCancel={handleReset}
          isImporting={isPending}
        />
      )}

      {phase === 'done' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
            <span className="text-green-600 text-xl">✓</span>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Import berhasil!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Data bahan sudah tersimpan di database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-primary hover:underline"
          >
            Import file lain
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ReportsPage() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan & Export</h1>
        <p className="text-muted-foreground text-sm">
          Export data ke Excel dan import bahan baku dari file Excel
        </p>
      </div>

      {/* Export section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileDown className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Export Data</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ExportButton
            type="materials"
            label="Master Bahan"
            description="Semua bahan baku beserta harga dan satuan"
            icon={Package}
          />
          <ExportButton
            type="menus"
            label="Menu & Profitabilitas"
            description="Menu dengan HPP, food cost, profit, dan margin terakhir"
            icon={UtensilsCrossed}
          />
          <ExportButton
            type="hpp"
            label="Laporan HPP"
            description="Riwayat kalkulasi HPP semua menu"
            icon={BarChart3}
          />
          <ExportButton
            type="price-history"
            label="Riwayat Harga Bahan"
            description="Semua perubahan harga bahan baku"
            icon={TrendingUp}
          />
          <ExportButton
            type="full"
            label="Laporan Lengkap"
            description="Semua data dalam satu file (4 sheet)"
            icon={FileSpreadsheet}
          />
        </div>
      </section>

      {/* Import section */}
      <section className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <FileUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Import Data</h2>
        </div>
        <ImportSection />
      </section>
    </div>
  )
}
