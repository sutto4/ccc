import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Providers from "@/components/providers";
import ConsoleShell from "@/components/console-shell";

export const metadata: Metadata = {
  title: "Discord Server Manager",
  description: "Admin console for your Discord server",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const csp = "default-src 'self'; img-src 'self' data: https://cdn.discordapp.com https://images.unsplash.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'";
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={csp} />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <ConsoleShell>{children}</ConsoleShell>
        </Providers>
      </body>
    </html>
  );
}
