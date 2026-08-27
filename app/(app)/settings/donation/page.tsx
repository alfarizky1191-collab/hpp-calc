import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { requireRole } from '@/lib/auth/rbac'
import { saveDonationSettings } from '@/lib/donations/actions'
import { createDonationClient, getQrisPublicUrl } from '@/lib/supabase/donation-server'

export default async function DonationSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireRole(['OWNER'])
  const supabase = await createDonationClient()
  const { data: settings } = await supabase.from('donation_settings').select('*').eq('id', true).maybeSingle()
  const qrisUrl = getQrisPublicUrl(settings?.qris_path ?? null)
  const { saved } = await searchParams

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div><Link href="/settings" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Kembali ke pengaturan</Link><h1 className="text-2xl font-bold tracking-tight">Pengaturan Donasi</h1><p className="mt-1 text-sm text-muted-foreground">Atur rekening bank dan gambar QRIS yang tampil pada halaman publik.</p></div>
      {saved === '1' && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="size-4" /> Pengaturan donasi berhasil disimpan.</div>}
      <form action={saveDonationSettings} className="space-y-6 rounded-xl border bg-card p-6">
        <input type="hidden" name="current_qris_path" value={settings?.qris_path ?? ''} />
        <div className="space-y-2"><label htmlFor="bank_name" className="text-sm font-medium">Nama bank</label><input id="bank_name" name="bank_name" maxLength={100} defaultValue={settings?.bank_name ?? ''} placeholder="Contoh: BCA" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
        <div className="space-y-2"><label htmlFor="account_number" className="text-sm font-medium">Nomor rekening</label><input id="account_number" name="account_number" inputMode="numeric" maxLength={50} defaultValue={settings?.account_number ?? ''} placeholder="Contoh: 1234567890" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
        <div className="space-y-2"><label htmlFor="account_holder" className="text-sm font-medium">Nama pemilik rekening</label><input id="account_holder" name="account_holder" maxLength={150} defaultValue={settings?.account_holder ?? ''} placeholder="Nama sesuai rekening" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
        <div className="space-y-3"><div><label htmlFor="qris" className="text-sm font-medium">Gambar QRIS</label><p className="mt-1 text-xs text-muted-foreground">PNG, JPG, atau WebP. Maksimal 5 MB.</p></div>{qrisUrl && <img src={qrisUrl} alt="QRIS saat ini" className="h-auto w-48 rounded-xl border bg-white p-2" />}<input id="qris" name="qris" type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground" /></div>
        <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Simpan pengaturan</button>
      </form>
    </div>
  )
}
