import { z } from 'zod'

export const recipeSchema = z.object({
  menuId: z.string().uuid('Menu tidak valid'),
  version: z.coerce.number().int().min(1).default(1),
  yieldQuantity: z
    .string()
    .min(1, 'Yield wajib diisi')
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      'Yield harus lebih dari 0'
    ),
  yieldUnit: z
    .string()
    .min(1, 'Satuan yield wajib diisi')
    .max(50)
    .trim(),
  notes: z.string().max(1000).trim().optional().nullable(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('DRAFT'),
})

export const recipeItemSchema = z.object({
  recipeId: z.string().uuid(),
  materialId: z.string().uuid('Bahan tidak valid'),
  quantity: z
    .string()
    .min(1, 'Jumlah wajib diisi')
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
      'Jumlah harus angka positif'
    ),
  unit: z.string().min(1, 'Satuan wajib diisi').max(50).trim(),
  unitCostSnapshot: z.string().optional(), // will be set server-side
})

export const recipeItemsSchema = z.object({
  recipeId: z.string().uuid(),
  items: z.array(
    z.object({
      materialId: z.string().uuid(),
      quantity: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0),
      unit: z.string().min(1).max(50).trim(),
    })
  ).min(1, 'Minimal 1 bahan'),
})

export type RecipeFormInput = z.infer<typeof recipeSchema>
export type RecipeItemInput = z.infer<typeof recipeItemSchema>
export type RecipeItemsInput = z.infer<typeof recipeItemsSchema>
