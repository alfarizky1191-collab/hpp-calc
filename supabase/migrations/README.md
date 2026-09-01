# Database Migrations — HPP Manager

## Urutan Migration

| File | Deskripsi |
|------|-----------|
| `20260811000001_core_tables.sql` | Extensions, enums, organizations, profiles, categories, trigger updated_at, auto-create org+profile on signup |
| `20260811000002_materials.sql` | Tabel materials (dengan generated column `unit_cost`), material_price_history, trigger log harga otomatis |
| `20260811000003_menus_recipes.sql` | Tabel menus, recipes, recipe_items, packaging_costs, enforce single active recipe per menu |
| `20260811000004_expenses_hpp_audit.sql` | Tabel expenses, hpp_calculations (immutable snapshot), audit_logs (append-only + trigger prevent mutation) |
| `20260811000005_helper_functions.sql` | Functions: get_my_org_id, get_my_role, is_org_member, log_audit, can_manage |
| `20260901163210_complete_security_hardening.sql` | Least-privilege grants, authenticated audit logging, and distributed rate limiting |
| `20260901163616_add_rate_limit_primary_key.sql` | Primary key for the private distributed rate-limit table |
| `20260811000006_rls_policies.sql` | RLS policies semua tenant-owned tables |

---

## Cara Menjalankan

```bash
# Link ke project Supabase
supabase link --project-ref <project-id>

# Preview perubahan
supabase db push --dry-run

# Apply ke remote
supabase db push
```

---

## Schema Overview

### Multi-Tenancy
Semua tabel bisnis memiliki kolom `organization_id` yang mereferensikan `organizations.id`. Row Level Security (RLS) memastikan user hanya bisa melihat data dari organisasi mereka sendiri.

### Soft Delete
Tabel `materials` menggunakan soft delete dengan kolom `deleted_at` dan `deleted_by`. Data yang dihapus tidak benar-benar hilang dari database.

### Generated Columns
- `materials.unit_cost` = `purchase_price / package_quantity` (dihitung otomatis PostgreSQL)
- `recipe_items.total_cost` = `quantity * unit_cost_snapshot` (generated)
- `packaging_costs.total_cost` = `quantity * unit_cost` (generated)

### Calculation Snapshot
Tabel `hpp_calculations` menyimpan snapshot immutable. Setiap kali HPP dihitung, baris baru ditambahkan. Baris lama tidak pernah diubah — sehingga laporan historis tetap valid walaupun harga bahan berubah.

### Audit Log
Tabel `audit_logs` adalah append-only. Trigger database mencegah UPDATE dan DELETE di level PostgreSQL. Function `log_audit()` adalah satu-satunya cara memasukkan data audit dari aplikasi.

### RBAC
- **OWNER**: full access
- **ADMIN**: operational management (tidak bisa manage users/roles)
- **STAFF**: read-only

Permission dicek di tiga layer:
1. UI (menyembunyikan tombol)
2. Server Actions / API Routes (requireRole)
3. Database RLS policies

---

## Regenerate TypeScript Types

Setelah mengubah schema, regenerate types:

```bash
npm run generate-types
```

Atau manual:

```bash
supabase gen types typescript --project-id <id> --schema public > types/database.ts
```
