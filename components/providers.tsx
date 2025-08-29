"use client";

import { type PropsWithChildren, useState, createContext, useContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider, useSession as useNextAuthSession } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";

// Create a shared session context to avoid duplicate session calls
const SharedSessionContext = createContext<ReturnType<typeof useNextAuthSession> | null>(null);

export function useSharedSession() {
  const context = useContext(SharedSessionContext);
  if (!context) {
    throw new Error('useSharedSession must be used within a SharedSessionProvider');
  }
  return context;
}

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
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      },
    },
  }));

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
      <SessionProvider>
        <SharedSessionProvider>
          <QueryClientProvider client={client}>
            {children}
            <Toaster />
          </QueryClientProvider>
        </SharedSessionProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
