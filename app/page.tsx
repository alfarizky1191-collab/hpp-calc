import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  ChevronRight,
  FileSpreadsheet,
  History,
  Heart,
  Package,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Utensils,
} from 'lucide-react'

const features = [
  {
    icon: Package,
    title: 'Kelola bahan baku',
    description: 'Simpan bahan, satuan, harga, dan riwayat perubahan harga secara rapi.',
  },
  {
    icon: Utensils,
    title: 'Resep & menu',
    description: 'Bangun resep dengan ingredient builder dan hitung biaya per porsi otomatis.',
  },
  {
    icon: Calculator,
    title: 'HPP otomatis',
    description: 'Hitung HPP, kemasan, overhead, profit, dan food cost tanpa spreadsheet rumit.',
  },
  {
    icon: TrendingUp,
    title: 'Profitabilitas',
    description: 'Lihat margin, simulasi harga, dan rekomendasi harga jual yang lebih sehat.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Excel siap pakai',
    description: 'Import bahan dari Excel dan export laporan ke XLSX atau CSV.',
  },
  {
    icon: ShieldCheck,
    title: 'Aman untuk tim',
    description: 'RBAC, RLS, audit log, rate limiting, dan security headers sudah disiapkan.',
  },
]

const steps = [
  ['01', 'Masukkan bahan', 'Catat harga beli, isi kemasan, dan satuan bahan baku.'],
  ['02', 'Susun resep', 'Pilih bahan dan tentukan takaran serta yield setiap resep.'],
  ['03', 'Dapatkan angka', 'HPP, food cost, profit, margin, dan harga jual tampil otomatis.'],
]

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8faf9] text-slate-950">
      <section className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_75%_10%,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.10),transparent_30%)]" />

        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Calculator className="size-5" />
            </span>
            <span className="text-xl">hppin<span className="text-emerald-600">.my.id</span></span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#fitur" className="transition hover:text-slate-950">Fitur</a>
            <a href="#cara-kerja" className="transition hover:text-slate-950">Cara kerja</a>
            <a href="#keunggulan" className="transition hover:text-slate-950">Keunggulan</a>
            <Link href="/donasi" className="inline-flex items-center gap-1.5 text-rose-600 transition hover:text-rose-700"><Heart className="size-4" /> Donasi</Link>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Buka aplikasi <ArrowRight className="size-4" />
          </Link>
        </nav>

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-32 lg:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-2 text-sm font-semibold text-emerald-700 shadow-sm backdrop-blur">
              <Sparkles className="size-4" />
              HPP lebih jelas. Keputusan lebih cepat.
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Tahu HPP-nya.
              <br />
              <span className="text-emerald-600">Tahu untungnya.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              HPPin membantu UMKM kuliner menghitung HPP, food cost, profit, dan harga jual dari bahan sampai menu — tanpa kalkulator manual yang bikin pusing.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                Mulai hitung HPP <ArrowRight className="size-5" />
              </Link>
              <a
                href="#fitur"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Lihat fitur <ChevronRight className="size-5" />
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Untuk UMKM kuliner', 'Perhitungan terstruktur', 'Siap untuk tim'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" /> {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-emerald-200/40 blur-3xl" />
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ringkasan menu</p>
                  <p className="mt-1 font-bold">Es Teh Manis</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Sehat</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5">
                <Metric label="HPP / cup" value="Rp 1.475" />
                <Metric label="Harga jual" value="Rp 5.000" />
                <Metric label="Food cost" value="29,5%" />
                <Metric label="Profit / cup" value="Rp 3.525" />
              </div>
              <div className="mx-5 mb-5 rounded-2xl bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Margin</p>
                    <p className="mt-1 text-3xl font-black">70,5%</p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <BarChart3 className="size-6" />
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[70.5%] rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="border-y border-slate-200 bg-white py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading eyebrow="Semua yang dibutuhkan" title="Dari bahan baku sampai tahu menu mana yang paling cuan." description="HPPin menyatukan kalkulasi yang biasanya tersebar di spreadsheet menjadi satu alur kerja yang lebih rapi." />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-slate-900/5">
                <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="bg-slate-950 py-24 text-white">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading dark eyebrow="Cara kerja" title="Tiga langkah. Satu angka yang bisa dipercaya." description="Bangun data dasar sekali, lalu gunakan untuk memahami biaya dan profitabilitas menu kamu." />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                <span className="text-sm font-black text-emerald-400">{number}</span>
                <h3 className="mt-8 text-xl font-bold">{title}</h3>
                <p className="mt-2 leading-7 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="keunggulan" className="bg-[#f8faf9] py-24">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 lg:grid-cols-2 lg:px-8 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">Bukan sekadar kalkulator</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Kelola angka bisnis, bukan cuma menghitungnya.</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Gunakan data HPP untuk menentukan harga jual, membaca margin, membandingkan menu, dan mengambil keputusan berdasarkan angka.</p>
            <div className="mt-8 space-y-4">
              {[
                'Snapshot HPP membuat hasil kalkulasi konsisten.',
                'Riwayat harga bahan membantu menghadapi perubahan supplier.',
                'Role owner, admin, dan staff untuk kerja tim yang lebih aman.',
                'Audit log mencatat aktivitas penting dalam aplikasi.',
              ].map((item) => (
                <div key={item} className="flex gap-3 text-sm font-medium text-slate-700">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" /></span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-slate-950 text-white"><History className="size-5" /></div>
              <div><p className="font-bold">Harga bahan berubah?</p><p className="text-sm text-slate-500">Data tetap terlacak.</p></div>
            </div>
            <div className="mt-7 space-y-3">
              {[
                ['Gula pasir', 'Rp 17.500/kg', 'Rp 18.000/kg'],
                ['Teh celup', 'Rp 32.000/160g', 'Rp 34.000/160g'],
                ['Cup 16 oz', 'Rp 400/pcs', 'Rp 425/pcs'],
              ].map(([name, oldPrice, newPrice]) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold">{name}</span>
                  <div className="text-right text-xs"><span className="text-slate-400 line-through">{oldPrice}</span><span className="ml-2 font-bold text-slate-700">{newPrice}</span></div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">HPP menu dapat dihitung kembali dengan data harga terbaru.</div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-emerald-600 px-7 py-12 text-center text-white shadow-2xl shadow-emerald-900/10 sm:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100">Siap mulai?</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-4xl font-black tracking-[-0.03em] sm:text-5xl">Jangan tebak untungnya. Hitung.</h2>
          <p className="mx-auto mt-4 max-w-xl text-emerald-50">Bangun data bahan dan resep kamu, lalu biarkan HPPin membantu membaca angka di balik setiap menu.</p>
          <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-emerald-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50">Masuk ke HPPin <ArrowRight className="size-5" /></Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="font-bold text-slate-800">hppin.my.id</div>
          <div className="flex items-center gap-5"><p>HPP, food cost, dan profitabilitas untuk bisnis kuliner.</p><Link href="/donasi" className="font-semibold text-rose-600 hover:text-rose-700">Donasi</Link></div>
        </div>
      </footer>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black tracking-tight">{value}</p>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description: string; dark?: boolean }) {
  return (
    <div className="max-w-2xl">
      <p className={`text-sm font-bold uppercase tracking-[0.18em] ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-4xl font-black tracking-[-0.03em] sm:text-5xl ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      <p className={`mt-5 text-lg leading-8 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>
    </div>
  )
}
