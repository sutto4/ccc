import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import ConsoleShell from "@/components/console-shell";

const fontSans = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ServerHub - Discord Server Management",
  description: "ServerHub: Manage roles, users, and features with powerful tools designed for modern Discord communities.",
  icons: {
    icon: '/brand/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Conditional CSP for development */}
        {process.env.NODE_ENV === "development" && (
          <meta
            httpEquiv="Content-Security-Policy"
            content="script-src 'self' 'unsafe-eval' 'unsafe-inline';"
          />
        )}
      </head>
      <body className={`${fontSans.className} min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
