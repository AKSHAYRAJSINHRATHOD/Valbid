import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VALBID — Pay to claim your spot',
  description: 'An independent community board for VALORANT player positions.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
