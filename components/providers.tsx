"use client"

import { type PropsWithChildren, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { SessionProvider } from "next-auth/react"

export default function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient())
  return (
    <SessionProvider basePath="/auth">
      <QueryClientProvider client={client}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  )
}
