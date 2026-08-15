# Deployment Checklist — HPP Manager

Gunakan checklist ini setiap kali deploy ke production.

---

## Pre-Deployment

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` diisi dengan URL project Supabase production
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` diisi dengan anon key production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` diisi dan **tidak** di-commit ke Git
- [ ] `NEXT_PUBLIC_APP_URL` diisi dengan URL production (tanpa trailing slash)
- [ ] `NODE_ENV=production` sudah diset

### Database
- [ ] Jalankan semua pending migrations: `supabase db push`
- [ ] Verifikasi semua tabel ada di Supabase dashboard
- [ ] Verifikasi RLS sudah enabled di semua tabel tenant-owned
- [ ] Test RLS: login sebagai STAFF, pastikan tidak bisa akses data org lain
- [ ] Verifikasi functions `get_my_org_id`, `get_my_role`, `log_audit` ada di database
- [ ] Backup database sebelum deploy (enable PITR di Supabase)

### TypeScript & Tests
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 warnings
- [ ] `npm run test` — semua tests pass
- [ ] `npm run build` — build sukses, tidak ada error

### Security
- [ ] Tidak ada secret di Git history (cek dengan `git log --all -- '*.env*'`)
- [ ] `.env.local` dan `.env.production.local` ada di `.gitignore`
- [ ] CSP headers dikonfigurasi di `next.config.ts` dengan domain Supabase yang benar
- [ ] Rate limiting aktif untuk auth routes dan import/export
- [ ] `SUPABASE_SERVICE_ROLE_KEY` tidak muncul di client bundle (cek di Network tab)

### Auth & RBAC
- [ ] Test signup flow: email confirmation bekerja
- [ ] Test login/logout
- [ ] Test password reset flow
- [ ] Test role OWNER: bisa akses semua fitur
- [ ] Test role STAFF: tidak bisa tambah/edit/hapus
- [ ] Test middleware: akses `/dashboard` tanpa login → redirect ke `/login`

---

## Deployment Steps

### Vercel (Recommended)

```bash
# 1. Push ke Git
git push origin main

# 2. Vercel auto-deploy dari main branch
# Atau manual:
vercel --prod
```

### Manual (Node.js server)

```bash
# 1. Install dependencies
npm ci --production=false

# 2. Build
npm run build

# 3. Start
npm start
```

---

## Post-Deployment

### Smoke Tests
- [ ] Homepage (`/`) redirect ke `/dashboard` atau `/login`
- [ ] Login berfungsi
- [ ] Dashboard load dalam < 3 detik
- [ ] Halaman `/materials` menampilkan data
- [ ] Tambah bahan baru berhasil
- [ ] Kalkulasi HPP berhasil
- [ ] Export Excel berhasil didownload

### Monitoring
- [ ] Cek Supabase dashboard: tidak ada error di logs
- [ ] Cek Vercel/server logs: tidak ada 500 errors
- [ ] Cek audit_logs tabel: login events tercatat

---

## Rollback

Jika ditemukan critical bug setelah deploy:

```bash
# Vercel: rollback ke deployment sebelumnya dari dashboard
# Atau:
vercel rollback

# Database: jika ada migration yang perlu dirollback,
# jalankan manual SQL rollback di Supabase SQL editor
```

---

## Database Migration (Production)

```bash
# Link ke project production
supabase link --project-ref <production-project-id>

# Preview migrations yang akan dijalankan
supabase db push --dry-run

# Apply migrations
supabase db push
```

> **PERINGATAN**: Selalu backup sebelum menjalankan migration production.
