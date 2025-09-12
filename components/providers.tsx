"use client";

import { type PropsWithChildren, useState, createContext, useContext } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider, useSession as useNextAuthSession, signIn, signOut } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { queryClient } from "@/lib/query-client";

// Create a shared session context to avoid duplicate session calls
const SharedSessionContext = createContext<ReturnType<typeof useNextAuthSession> | null>(null);

export function useSharedSession() {
  const context = useContext(SharedSessionContext);
  if (!context) {
    throw new Error('useSharedSession must be used within a SharedSessionProvider');
  }
  return context;
}

// Export NextAuth functions
export { signIn, signOut };

// Wrapper component that provides shared session
function SharedSessionProvider({ children }: PropsWithChildren) {
  const sessionData = useNextAuthSession();
  return (
    <SharedSessionContext.Provider value={sessionData}>
      {children}
    </SharedSessionContext.Provider>
  );
}

export default function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
      <SessionProvider>
        <SharedSessionProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster />
          </QueryClientProvider>
        </SharedSessionProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
