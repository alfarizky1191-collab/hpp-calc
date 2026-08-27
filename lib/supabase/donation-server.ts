import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type DonationSettings = {
  id: boolean
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  qris_path: string | null
  updated_at: string
  updated_by: string | null
}

type DonationDatabase = {
  public: {
    Tables: {
      donation_settings: {
        Row: DonationSettings
        Insert: Partial<DonationSettings>
        Update: Partial<DonationSettings>
        Relationships: []
      }
      platform_admins: {
        Row: { user_id: string; created_at: string }
        Insert: { user_id: string; created_at?: string }
        Update: never
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

export async function createDonationClient() {
  const cookieStore = await cookies()

  return createServerClient<DonationDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot mutate cookies; middleware refreshes them.
          }
        },
      },
    }
  )
}

export function getQrisPublicUrl(path: string | null) {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/donation-assets/${path}`
}
