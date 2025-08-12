# UI Integration, Configuration, and Deploy Guide

Overview
- This UI now supports Discord OAuth via NextAuth and route protection.
- Follow the steps below to configure local dev and deploy to Vercel.

Prereqs
- Node.js 18+ and pnpm.
- A Discord application (for OAuth).

1) Create a Discord Application
- Go to https://discord.com/developers/applications → New Application.
- Add a Bot user (for later) but for UI auth you only need OAuth2.
- Under OAuth2 → General:
  - Set Redirects:
    - Local: http://localhost:3000/api/auth/callback/discord
    - Prod: https://YOUR_DOMAIN.com/api/auth/callback/discord
- Copy the Client ID and Client Secret.

2) Configure environment variables
Create a .env.local file at the project root with:
- NEXTAUTH_URL=http://localhost:3000
- NEXTAUTH_SECRET=generate_a_long_random_string
- DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
- DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
- NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
- NEXT_PUBLIC_DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
- NEXT_PUBLIC_API_BASE_URL=/api

Note: Only variables prefixed with NEXT_PUBLIC_ are exposed to the browser; keep secrets server-side [^1].

3) Run locally
- pnpm install
- pnpm dev
- Open http://localhost:3000 and click Sign in.

4) Route protection
- Dashboard and all guild pages require sign-in. Unauthenticated users are redirected to /signin.

5) Deploy to Vercel (recommended)
- Push the project to GitHub.
- Import the repo in Vercel.
- Set the same environment variables in Vercel Project Settings → Environment Variables:
  - NEXTAUTH_URL=https://YOUR_DOMAIN.com
  - NEXTAUTH_SECRET=...
  - DISCORD_CLIENT_ID=...
  - DISCORD_CLIENT_SECRET=...
    - NEXT_PUBLIC_APP_BASE_URL=https://YOUR_DOMAIN.com
    - NEXT_PUBLIC_DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
    - NEXT_PUBLIC_API_BASE_URL=/api
- Add your domain to Discord OAuth redirect list.
- Deploy.

6) Docker (optional)
Use this Dockerfile to containerize the UI:
\`\`\`dockerfile
# UI-only Next.js production image
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
\`\`\`

Build and run:
- docker build -t discord-ui .
- docker run -p 3000:3000 --env-file .env.production discord-ui

[^1]: Creating a full-stack app
\`\`\`

```typescriptreact file="components/providers.tsx"
[v0-no-op-code-block-prefix]"use client"

import { type PropsWithChildren, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { SessionProvider } from "next-auth/react"

export default function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient())
  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  )
}
