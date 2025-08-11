"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut } from "lucide-react"

export default function AuthButtons() {
  const { status } = useSession()
  if (status === "loading") {
    return (
      <Button variant="outline" size="sm" disabled>
        Loading…
      </Button>
    )
  }
  if (status === "authenticated") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void signOut({ callbackUrl: "/" })
        }}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign out
      </Button>
    )
  }
  return (
    <Button
      size="sm"
      onClick={() => {
        void signIn("discord", { callbackUrl: "/" })
      }}
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign in
    </Button>
  )
}
