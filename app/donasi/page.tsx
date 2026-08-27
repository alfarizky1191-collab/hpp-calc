import Link from 'next/link'
import { ArrowLeft, Building2, Copy, Heart, QrCode, ShieldCheck } from 'lucide-react'
import { createDonationClient, getQrisPublicUrl } from '@/lib/supabase/donation-server'

export const metadata = {
  title: 'Donasi',
  description: 'Dukung pengembangan HPPin melalui transfer bank atau QRIS.',
}

export default async function DonationPage() {
  const supabase = await createDonationClient()
  const { data: settings } = await supabase
    .from('donation_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle()

  const qrisUrl = getQrisPublicUrl(settings?.qris_path ?? null)
  const hasBank = Boolean(settings?.bank_name && settings.account_number && settings.account_holder)

  return (
    <main className="min-h-screen bg-[#f8faf9] text-slate-950">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft className="size-4" /> Kembali
        </Link>
        <Link href="/" className="text-lg font-black">hppin<span className="text-emerald-600">.my.id</span></Link>
      </nav>

      <section className="mx-auto max-w-5xl px-5 pb-20 pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600"><Heart className="size-7 fill-current" /></div>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Dukung HPPin tetap berkembang</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">Donasi kamu membantu biaya server, pengembangan fitur, dan menjaga HPPin tetap bermanfaat untuk UMKM kuliner.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Building2 className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Transfer langsung</p><h2 className="font-bold">Rekening bank</h2></div></div>
            {hasBank ? (
              <div className="mt-7 space-y-5">
                <div><p className="text-xs font-medium text-slate-400">Bank</p><p className="mt-1 text-lg font-bold">{settings?.bank_name}</p></div>
                <div><p className="text-xs font-medium text-slate-400">Nomor rekening</p><div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"><p className="font-mono text-lg font-black tracking-wide">{settings?.account_number}</p><Copy className="size-4 text-slate-400" /></div></div>
                <div><p className="text-xs font-medium text-slate-400">Atas nama</p><p className="mt-1 font-bold">{settings?.account_holder}</p></div>
              </div>
            ) : <EmptyState message="Rekening donasi belum tersedia." />}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-700"><QrCode className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bayar praktis</p><h2 className="font-bold">QRIS</h2></div></div>
            {qrisUrl ? (
              <div className="mt-6 text-center"><div className="mx-auto max-w-xs rounded-2xl border border-slate-200 bg-white p-3"><img src={qrisUrl} alt="QRIS donasi HPPin" className="h-auto w-full rounded-xl" /></div><p className="mt-4 text-sm text-slate-500">Buka aplikasi pembayaran lalu pindai kode QRIS.</p></div>
            ) : <EmptyState message="QRIS donasi belum tersedia." />}
          </section>
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-emerald-900"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><p>Donasi bersifat sukarela dan tidak memengaruhi akses maupun fitur akun HPPin.</p></div>
      </section>
    </main>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="mt-7 rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-400">{message}</div>
}
