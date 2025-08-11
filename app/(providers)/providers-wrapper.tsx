import type React from "react"
import Providers from "@/components/providers"

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
