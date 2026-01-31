import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'MoltBeat Pulse - Analytics Dashboard',
  description: 'Real-time analytics and monitoring for MoltBeat AI agents',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
