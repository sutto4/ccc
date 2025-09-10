"use client"

import { signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"
import { useEffect, useState } from "react"

export default function SignInPage() {
  const [callbackUrl, setCallbackUrl] = useState("/guilds")

  useEffect(() => {
    // Get the current URL to preserve the original destination
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      const params = url.searchParams

      // Check for NextAuth callback URL parameter
      const nextAuthCallback = params.get("callbackUrl")
      if (nextAuthCallback) {
        const decodedUrl = decodeURIComponent(nextAuthCallback)
        setCallbackUrl(decodedUrl)
        // Store in localStorage as backup
        localStorage.setItem('authCallbackUrl', decodedUrl)
        return
      }

      // Check for original URL before auth redirect
      const originalUrl = params.get("from") || params.get("redirect") || params.get("url")
      if (originalUrl) {
        const decodedUrl = decodeURIComponent(originalUrl)
        setCallbackUrl(decodedUrl)
        localStorage.setItem('authCallbackUrl', decodedUrl)
        return
      }

      // Check localStorage for previously stored callback URL
      const storedCallbackUrl = localStorage.getItem('authCallbackUrl')
      if (storedCallbackUrl) {
        setCallbackUrl(storedCallbackUrl)
        return
      }

      // If no specific URL found, use the current path (minus /signin)
      const currentPath = url.pathname
      if (currentPath !== "/signin") {
        const fallbackUrl = currentPath + url.search
        setCallbackUrl(fallbackUrl)
        localStorage.setItem('authCallbackUrl', fallbackUrl)
        return
      }
    }
  }, [])

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
              // Clear any stored callback URL to prevent conflicts
              localStorage.removeItem('authCallbackUrl');
              void signIn("discord", { callbackUrl })
            }}
          >
            Sign in with Discord
          </Button>
          {callbackUrl !== "/guilds" && (
            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to: {callbackUrl}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
