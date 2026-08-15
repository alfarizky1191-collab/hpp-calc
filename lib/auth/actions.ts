'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/auth/schemas'
import type { ActionResult } from '@/types'

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------
export async function login(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Input tidak valid',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Don't expose internal error details to client
    return {
      success: false,
      error: 'Email atau password salah',
    }
  }

  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------
export async function register(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    organizationName: formData.get('organizationName'),
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Input tidak valid',
    }
  }

  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: parsed.data.fullName,
        organization_name: parsed.data.organizationName,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: 'Email sudah terdaftar' }
    }
    return { success: false, error: 'Pendaftaran gagal. Coba lagi.' }
  }

  return {
    success: true,
    data: undefined,
  }
}

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------
export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ---------------------------------------------------------------------------
// forgotPassword
// ---------------------------------------------------------------------------
export async function forgotPassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get('email') }

  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Input tidak valid',
    }
  }

  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    }
  )

  if (error) {
    // Always return success to prevent email enumeration
  }

  // Always succeed — don't reveal whether email exists
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------
export async function resetPassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = resetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Input tidak valid',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { success: false, error: 'Gagal mengubah password. Coba lagi.' }
  }

  redirect('/login?message=password-updated')
}
