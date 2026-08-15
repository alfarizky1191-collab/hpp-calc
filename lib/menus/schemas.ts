import { z } from 'zod'

export const menuSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama menu wajib diisi')
    .max(255, 'Nama terlalu panjang')
    .trim(),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().max(1000).trim().optional().nullable(),
  sellingPrice: z
    .string()
    .min(1, 'Harga jual wajib diisi')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Harga harus berupa angka positif'),
  targetFoodCost: z
    .string()
    .min(1, 'Target food cost wajib diisi')
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 && parseFloat(v) <= 100,
      'Target food cost harus antara 0 dan 100'
    )
    .default('30'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).default('DRAFT'),
})

export const updateMenuSchema = menuSchema.partial().extend({
  id: z.string().uuid(),
})

export const packagingCostSchema = z.object({
  menuId: z.string().uuid(),
  name: z.string().min(1).max(100).trim(),
  quantity: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Harus angka positif')
    .default('1'),
  unitCost: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Harus angka positif'),
})

export const updatePackagingCostSchema = packagingCostSchema.partial().extend({
  id: z.string().uuid(),
})

export type MenuFormInput = z.infer<typeof menuSchema>
export type PackagingCostInput = z.infer<typeof packagingCostSchema>
