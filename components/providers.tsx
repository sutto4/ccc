"use client";

import { type PropsWithChildren, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider, useTheme } from "next-themes";

export default function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient());
  // Force light mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" value={{ light: "light" }} enableSystem={false} disableTransitionOnChange>
      <SessionProvider>
        <QueryClientProvider client={client}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
