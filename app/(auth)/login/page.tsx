'use client'

import { Suspense, useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { login } from '@/lib/auth/actions'
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

function LoginMessages() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const error = searchParams.get('error')

  return (
    <>
      {message === 'password-updated' && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Password berhasil diubah. Silakan masuk.
        </div>
      )}
      {error === 'auth-callback-failed' && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          Link tidak valid atau sudah kadaluarsa. Coba lagi.
        </div>
      )}
    </>
  )
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Lupa password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <img src="/logo.png" alt="HPP Manager" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-semibold text-lg">HPP Manager</span>
        </div>
        <CardTitle className="text-2xl">Masuk</CardTitle>
        <CardDescription>
          Masukkan email dan password untuk melanjutkan
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Suspense fallback={null}>
          <LoginMessages />
        </Suspense>
        <LoginForm />
      </CardContent>

      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Belum punya akun?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Daftar sekarang
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
