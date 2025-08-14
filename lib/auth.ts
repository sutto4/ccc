import type { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { env } from "@/lib/env"

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID || "",
      clientSecret: env.DISCORD_CLIENT_SECRET || "",
      authorization: {
        params: { scope: "identify guilds email" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // persist OAuth access token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(token as any).accessToken = account.access_token
      }
      if (account && profile) {
        // Attach Discord identity info
        // @ts-expect-error id is present on Discord profile
        token.discordId = profile.id
        // @ts-expect-error global_name exists on Discord profile
        token.name = token.name || (profile.global_name as string | undefined) || token.name
        // Default everyone to viewer; later, map real RBAC from your DB/API
        token.role = token.role || "viewer"
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).id = token.sub
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).discordId = (token as any).discordId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session as any).role = (token as any).role ?? "viewer"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session as any).accessToken = (token as any).accessToken
      }
      return session
    },
  },
}
