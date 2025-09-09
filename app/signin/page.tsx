"use client"

import { signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] grid place-items-center bg-background">
      <Card className="w-[380px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sign in
          </CardTitle>
          <p className="text-sm text-muted-foreground">Use your Discord account to continue.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            onClick={() => {
              void signIn("discord", { callbackUrl: "/guilds" })
            }}
          >
            Sign in with Discord
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
