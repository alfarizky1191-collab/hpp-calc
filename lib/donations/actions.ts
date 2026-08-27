'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createDonationClient } from '@/lib/supabase/donation-server'

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_QRIS_SIZE = 5 * 1024 * 1024

export async function saveDonationSettings(formData: FormData) {
  const supabase = await createDonationClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) throw new Error('Kamu tidak memiliki akses untuk mengubah pengaturan donasi.')

  const bankName = String(formData.get('bank_name') ?? '').trim()
  const accountNumber = String(formData.get('account_number') ?? '').replace(/[^0-9]/g, '')
  const accountHolder = String(formData.get('account_holder') ?? '').trim()
  const qrisFile = formData.get('qris')
  let qrisPath = String(formData.get('current_qris_path') ?? '') || null

  if (bankName.length > 100 || accountNumber.length > 50 || accountHolder.length > 150) {
    throw new Error('Data rekening terlalu panjang.')
  }

  if (qrisFile instanceof File && qrisFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(qrisFile.type)) {
      throw new Error('QRIS harus berupa PNG, JPG, atau WebP.')
    }
    if (qrisFile.size > MAX_QRIS_SIZE) {
      throw new Error('Ukuran gambar QRIS maksimal 5 MB.')
    }

    const extension = qrisFile.type === 'image/png' ? 'png' : qrisFile.type === 'image/webp' ? 'webp' : 'jpg'
    const newPath = `qris.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('donation-assets')
      .upload(newPath, qrisFile, { upsert: true, contentType: qrisFile.type })

    if (uploadError) throw new Error(`Gagal mengunggah QRIS: ${uploadError.message}`)

    if (qrisPath && qrisPath !== newPath) {
      await supabase.storage.from('donation-assets').remove([qrisPath])
    }
    qrisPath = newPath
  }

  const { error } = await supabase.from('donation_settings').upsert({
    id: true,
    bank_name: bankName || null,
    account_number: accountNumber || null,
    account_holder: accountHolder || null,
    qris_path: qrisPath,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  })

  if (error) throw new Error(`Gagal menyimpan pengaturan donasi: ${error.message}`)

  revalidatePath('/donasi')
  revalidatePath('/settings/donation')
  redirect('/settings/donation?saved=1')
}
