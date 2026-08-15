import { z } from 'zod'

// ---------------------------------------------------------------------------
// Create / Edit Material
// ---------------------------------------------------------------------------
export const materialSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama bahan wajib diisi')
    .max(255, 'Nama terlalu panjang')
    .trim(),

  categoryId: z.string().uuid('Kategori tidak valid').optional().nullable(),

  purchaseUnit: z
    .string()
    .min(1, 'Satuan pembelian wajib diisi')
    .max(50, 'Satuan terlalu panjang')
    .trim(),

  purchasePrice: z
    .string()
    .min(1, 'Harga pembelian wajib diisi')
    .refine((v) => {
      const n = parseFloat(v)
      return !isNaN(n) && n >= 0
    }, 'Harga harus berupa angka positif')
    .refine((v) => parseFloat(v) <= 999_999_999_99, 'Harga terlalu besar'),

  packageQuantity: z
    .string()
    .min(1, 'Isi per kemasan wajib diisi')
    .refine((v) => {
      const n = parseFloat(v)
      return !isNaN(n) && n > 0
    }, 'Isi per kemasan harus lebih dari 0'),

  baseUnit: z
    .string()
    .min(1, 'Satuan terkecil wajib diisi')
    .max(50, 'Satuan terlalu panjang')
    .trim(),

  supplier: z
    .string()
    .max(255, 'Nama supplier terlalu panjang')
    .trim()
    .optional()
    .nullable(),

  notes: z.string().max(1000, 'Catatan terlalu panjang').trim().optional().nullable(),

  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const updateMaterialSchema = materialSchema.partial().extend({
  id: z.string().uuid('ID tidak valid'),
})

export type MaterialFormInput = z.infer<typeof materialSchema>
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>

// ---------------------------------------------------------------------------
// Search / filter
// ---------------------------------------------------------------------------
export const materialSearchSchema = z.object({
  q: z.string().max(100).trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'all']).default('ACTIVE'),
  categoryId: z.string().uuid().optional().nullable(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type MaterialSearchInput = z.infer<typeof materialSearchSchema>
