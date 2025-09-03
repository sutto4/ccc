import { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ServerMate Documentation',
  description: 'Complete guide to ServerMate Discord bot features, commands, and configuration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
