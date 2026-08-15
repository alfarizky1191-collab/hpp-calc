'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { register } from '@/lib/auth/actions'
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

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, initialState)

  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              H
            </div>
            <span className="font-semibold text-lg">HPP Manager</span>
          </div>
          <CardTitle className="text-2xl">Cek email kamu</CardTitle>
          <CardDescription>
            Kami sudah mengirimkan link konfirmasi ke email kamu. Klik link
            tersebut untuk mengaktifkan akun.
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
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            H
          </div>
          <span className="font-semibold text-lg">HPP Manager</span>
        </div>
        <CardTitle className="text-2xl">Daftar</CardTitle>
        <CardDescription>
          Buat akun untuk mulai menghitung HPP bisnis kamu
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
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Nama kamu"
              autoComplete="name"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationName">Nama Bisnis</Label>
            <Input
              id="organizationName"
              name="organizationName"
              type="text"
              placeholder="Nama usaha atau UMKM kamu"
              required
              disabled={isPending}
            />
          </div>

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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 karakter"
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Mendaftar...' : 'Buat Akun'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Masuk
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
