import Link from 'next/link'
import { ArrowLeft, Building2, Calculator, Copy, QrCode, ShieldCheck } from 'lucide-react'
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
    <main className="min-h-screen bg-[#f3f7fd] text-[#10254a]">
      <nav className="border-b border-[#dbe5f2] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#526581] hover:text-[#185adb]">
          <ArrowLeft className="size-4" /> Kembali
        </Link>
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight text-[#0c2248]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#185adb] text-white"><Calculator className="size-4" /></span>
          <span className="text-lg">HPPin<span className="text-[#185adb]">.my.id</span></span>
        </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-14 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-[#185adb]">DUKUNG PENGEMBANGAN HPPIN</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.035em] text-[#0b1f43] sm:text-5xl">Bantu HPPin tetap berkembang</h1>
          <p className="mt-5 text-lg leading-8 text-[#526581]">Donasi kamu membantu biaya server, pengembangan fitur, dan menjaga HPPin tetap bermanfaat untuk UMKM kuliner.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <section className="rounded-[14px] border border-[#d8e3f0] bg-white p-6 shadow-[0_12px_35px_rgba(24,55,100,0.07)] sm:p-8">
            <div className="flex items-center gap-3"><Building2 className="size-5 text-[#185adb]" /><div><p className="text-xs font-bold uppercase tracking-wider text-[#6a7b94]">Transfer langsung</p><h2 className="font-extrabold text-[#0b1f43]">Rekening bank</h2></div></div>
            {hasBank ? (
              <div className="mt-7 space-y-5">
                <div><p className="text-xs font-medium text-[#6a7b94]">Bank</p><p className="mt-1 text-lg font-extrabold">{settings?.bank_name}</p></div>
                <div><p className="text-xs font-medium text-[#6a7b94]">Nomor rekening</p><div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-[#dbe5f2] bg-[#f4f8fe] px-4 py-3"><p className="font-mono text-lg font-extrabold tracking-wide">{settings?.account_number}</p><Copy className="size-4 text-[#6a7b94]" /></div></div>
                <div><p className="text-xs font-medium text-[#6a7b94]">Atas nama</p><p className="mt-1 font-bold">{settings?.account_holder}</p></div>
              </div>
            ) : <EmptyState message="Rekening donasi belum tersedia." />}
          </section>

          <section className="rounded-[14px] border border-[#d8e3f0] bg-white p-6 shadow-[0_12px_35px_rgba(24,55,100,0.07)] sm:p-8">
            <div className="flex items-center gap-3"><QrCode className="size-5 text-[#185adb]" /><div><p className="text-xs font-bold uppercase tracking-wider text-[#6a7b94]">Bayar praktis</p><h2 className="font-extrabold text-[#0b1f43]">QRIS</h2></div></div>
            {qrisUrl ? (
              <div className="mt-6 text-center"><div className="mx-auto max-w-xs rounded-xl border border-[#d8e3f0] bg-white p-3"><img src={qrisUrl} alt="QRIS donasi HPPin" className="h-auto w-full rounded-lg" /></div><p className="mt-4 text-sm text-[#526581]">Buka aplikasi pembayaran lalu pindai kode QRIS.</p></div>
            ) : <EmptyState message="QRIS donasi belum tersedia." />}
          </section>
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-[#cbdaf0] bg-[#eaf2ff] px-5 py-4 text-sm text-[#183d75]"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><p>Donasi bersifat sukarela dan tidak memengaruhi akses maupun fitur akun HPPin.</p></div>
      </section>
    </main>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="mt-7 rounded-xl border border-dashed border-[#c8d6e8] bg-[#f8fbff] px-5 py-12 text-center text-sm text-[#6a7b94]">{message}</div>
}
