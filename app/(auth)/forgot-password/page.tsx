'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ActionResult } from '@/types'

const initialState: ActionResult = { success: false, error: '' }

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    forgotPassword,
    initialState
  )

  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Cek email kamu</CardTitle>
          <CardDescription>
            Jika email kamu terdaftar, kami akan mengirimkan link untuk reset
            password. Periksa juga folder spam.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-sm text-primary hover:underline">
            ← Kembali ke halaman masuk
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Lupa Password</CardTitle>
        <CardDescription>
          Masukkan email kamu. Kami akan mengirimkan link untuk reset password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!state.success && state.error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nama@bisnis.com"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Mengirim...' : 'Kirim Link Reset'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
          ← Kembali ke halaman masuk
        </Link>
      </CardFooter>
    </Card>
  )
}
