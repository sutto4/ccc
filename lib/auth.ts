import type { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { env } from "@/lib/env"
import { isAdmin } from "@/lib/db"

// Validate required environment variables
if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
  console.error("Missing required Discord OAuth environment variables");
  console.error("DISCORD_CLIENT_ID:", env.DISCORD_CLIENT_ID ? "SET" : "MISSING");
  console.error("DISCORD_CLIENT_SECRET:", env.DISCORD_CLIENT_SECRET ? "SET" : "MISSING");
}

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
  secret: env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/signin",
  },
  // Add logging to debug the issue
  logger: {
    error(code, ...message) {
      console.error("NextAuth Error:", code, ...message);
    },
    warn(code, ...message) {
      console.warn("NextAuth Warning:", code, ...message);
    },
    debug(code, ...message) {
      console.log("NextAuth Debug:", code, ...message);
    },
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // persist OAuth access token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(token as any).accessToken = account.access_token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(token as any).refreshToken = account.refresh_token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(token as any).expiresAt = account.expires_at
      }
      
      // If token is expired, try to refresh it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((token as any).expiresAt && Date.now() > (token as any).expiresAt * 1000) {
        console.log('Token expired, attempting refresh...');
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const refreshToken = (token as any).refreshToken;
          if (refreshToken) {
            const response = await fetch('https://discord.com/api/oauth2/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: env.DISCORD_CLIENT_ID || '',
                client_secret: env.DISCORD_CLIENT_SECRET || '',
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(token as any).accessToken = data.access_token;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(token as any).expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
              console.log('Token refreshed successfully');
            }
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
        }
      }
      if (account && profile) {
        // Attach Discord identity info
        // @ts-expect-error id is present on Discord profile
        token.discordId = profile.id
        // @ts-expect-error global_name exists on Discord profile
        token.name = token.name || (profile.global_name as string | undefined) || token.name
        
        // Check database for user role if we have a discordId
        if (profile.id && !token.role) {
          try {
            // Only check admin status if database is configured
            if (env.DB_HOST && env.DB_USER && env.DB_NAME) {
              const isUserAdmin = await isAdmin(profile.id);
              token.role = isUserAdmin ? "admin" : "viewer";
            } else {
              token.role = "viewer";
            }
          } catch (error) {
            console.error("Error checking user role:", error);
            token.role = "viewer";
          }
        }
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
