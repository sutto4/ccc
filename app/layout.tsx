import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import ConsoleShell from "@/components/console-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DuckCord Admin - Discord Server Management",
  description: "The ultimate Discord server management platform. Manage roles, users, and features with powerful tools designed for modern communities.",
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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
