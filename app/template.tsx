import type React from "react"
import ProvidersWrapper from "./(providers)/providers-wrapper"

export default function Template({ children }: { children: React.ReactNode }) {
  // Wrap all pages under app/ with React Query + Toaster
  return <ProvidersWrapper>{children}</ProvidersWrapper>
}
