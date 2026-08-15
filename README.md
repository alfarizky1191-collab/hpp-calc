# HPP Manager

Aplikasi web untuk menghitung **Harga Pokok Produksi (HPP)**, food cost, profit, margin, dan menganalisis profitabilitas menu — dirancang untuk UMKM kuliner.

---

## Fitur

- **Master Bahan** — CRUD bahan baku dengan riwayat harga otomatis
- **Menu & Resep** — Buat menu, resep berversi, dan ingredient builder interaktif
- **Kalkulasi HPP** — Server-side HPP engine dengan snapshot immutable
- **Biaya Operasional** — Catat overhead per periode dengan ringkasan per kategori
- **Profitabilitas** — Food cost, profit, margin, smart pricing, dan what-if simulation
- **Dashboard** — KPI, ranking menu, dan alert food cost melebihi target
- **Excel Import/Export** — Import bahan dari Excel, export laporan ke XLSX/CSV
- **Audit Log** — Log semua aktivitas append-only
- **RBAC** — Owner / Admin / Staff dengan permission di UI + Server + Database (RLS)

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Validation | Zod |
| Excel | SheetJS (xlsx) |
| Charts | Recharts v3 |
| Testing | Vitest |

---

## Struktur Folder

```
hpp-manager/
├── app/
│   ├── (auth)/          # Login, register, forgot/reset password
│   ├── (app)/           # Protected app routes
│   │   ├── dashboard/
│   │   ├── materials/
│   │   ├── menus/
│   │   ├── recipes/
│   │   ├── expenses/
│   │   ├── profitability/
│   │   ├── reports/
│   │   └── settings/
│   └── api/             # Route Handlers (import, export)
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── layout/          # Sidebar, mobile header
│   ├── materials/
│   ├── menus/
│   ├── recipes/
│   ├── expenses/
│   └── profitability/
├── lib/
│   ├── hpp/             # HPP Engine (source of truth untuk kalkulasi)
│   ├── auth/            # Auth actions + schemas + RBAC utils
│   ├── materials/       # Material actions + schemas
│   ├── menus/           # Menu actions + schemas
│   ├── recipes/         # Recipe actions + schemas
│   ├── expenses/        # Expense actions + schemas
│   ├── profitability/   # Profitability actions
│   ├── audit/           # Audit log actions
│   ├── excel/           # Import/export utilities
│   ├── security/        # Rate limiter, error handler, file validator
│   └── supabase/        # Supabase client (server + browser)
├── supabase/
│   └── migrations/      # Database migrations (lihat migrations/README.md)
└── types/
    ├── database.ts      # Generated from Supabase schema
    ├── hpp.ts           # HPP domain types
    └── index.ts         # Shared app types
```

---

## Setup Development

### 1. Clone & Install

```bash
git clone <repo-url>
cd hpp-manager
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local dengan credentials Supabase kamu
```

### 3. Database

```bash
# Link ke Supabase project
supabase link --project-ref <project-id>

# Apply migrations
supabase db push
```

### 4. Generate Types

```bash
npm run generate-types
```

### 5. Run

```bash
npm run dev
```

---

## Scripts

| Script | Deskripsi |
|--------|-----------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run test` | Run all tests (Vitest) |
| `npm run test:coverage` | Tests dengan coverage report |
| `npm run generate-types` | Regenerate TypeScript types dari Supabase |
| `npm run db:push` | Push migrations ke Supabase |
| `npm run verify` | typecheck + lint + test + build (pre-deploy) |

---

## HPP Engine

Semua formula kalkulasi HPP ada di `lib/hpp/` — tidak ada duplikasi di komponen UI.

```
Harga Unit      = Harga Pembelian ÷ Isi Per Kemasan
Cost Bahan      = Quantity × Harga Unit
HPP Bahan/unit  = Total Cost Bahan ÷ Yield
HPP Total       = HPP Bahan + Kemasan + Overhead + Lain-lain
Profit          = Harga Jual − HPP Total
Food Cost %     = HPP Bahan ÷ Harga Jual × 100
Margin %        = Profit ÷ Harga Jual × 100
Rekomendasi     = HPP ÷ Target Food Cost %
```

Kalkulasi final selalu dilakukan **server-side** dan disimpan sebagai snapshot immutable.

---

## Security

- RLS di semua tabel — tenant isolation enforced di database
- Rate limiting: login (10/mnt), register (5/mnt), import (20/mnt)
- Security headers: CSP, HSTS, X-Frame-Options, Permissions-Policy
- File upload: size limit 10 MB, magic bytes check, formula injection prevention
- Error responses: tidak ada stack trace / SQL error yang bocor ke client
- Audit log: append-only, semua aksi CRUD tercatat

---

## Deployment

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk checklist lengkap.

---

## Tests

```bash
npm run test
# 205 tests passing
```

Test coverage: HPP engine, security utilities (rate limiter, error handler, file upload), Zod schemas (auth, materials, expenses).
