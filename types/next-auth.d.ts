import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    role?: "owner" | "admin" | "viewer"
    user: {
      id?: string
      discordId?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "owner" | "admin" | "viewer"
    discordId?: string
  }
}
