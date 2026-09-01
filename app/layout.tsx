import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { connection } from 'next/server'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://hppin.my.id'),
  title: {
    default: 'HPPin — Hitung HPP, Tahu Untungnya',
    template: '%s | HPPin',
  },
  description: 'HPPin membantu UMKM kuliner menghitung HPP, food cost, profit, margin, dan harga jual dengan lebih mudah.',
  applicationName: 'HPPin',
  keywords: ['HPP', 'HPP kuliner', 'food cost', 'harga jual', 'profit UMKM', 'kalkulator HPP'],
  alternates: { canonical: 'https://hppin.my.id' },
  openGraph: {
    type: 'website',
    url: 'https://hppin.my.id',
    siteName: 'HPPin',
    title: 'HPPin — Hitung HPP, Tahu Untungnya',
    description: 'Kalkulator HPP dan analisis profitabilitas untuk bisnis kuliner.',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HPPin — Hitung HPP, Tahu Untungnya',
    description: 'Kalkulator HPP dan analisis profitabilitas untuk bisnis kuliner.',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // A per-request CSP nonce requires dynamic rendering so Next.js can attach
  // the nonce to its framework and hydration scripts.
  await connection()

  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
