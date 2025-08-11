"use client"

import { Button, type ButtonProps } from "@/components/ui/button"

export default function InviteBotButton(props: ButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_APP_BASE_URL
    ? `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/auth/callback/discord`
    : undefined
  const scopes = ["bot", "applications.commands"]
  const permissions = "268954736" // example permissions set
  const inviteUrl = clientId
    ? `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(
        clientId,
      )}&permissions=${permissions}&scope=${encodeURIComponent(scopes.join(" "))}${
        redirectUri ? `&redirect_uri=${encodeURIComponent(redirectUri)}` : ""
      }`
    : "#"

  return (
    <Button asChild disabled={!clientId} {...props}>
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a href={inviteUrl} target={clientId ? "_blank" : undefined} rel={clientId ? "noreferrer" : undefined}>
        Invite bot
      </a>
    </Button>
  )
}
