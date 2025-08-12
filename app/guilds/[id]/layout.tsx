import Link from "next/link"
import type { PropsWithChildren } from "react"
import { notFound, redirect } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import SiteHeader from "@/components/site-header"
import { fetchGuilds } from "@/lib/api"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// simple server-side features fetcher using the same env as client
async function fetchFeaturesSSR(guildId: string) {
  const RAW = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  const BASE = RAW.replace(/\/+$/, "")
  const HAS_API_SUFFIX = /\/api$/i.test(BASE)
  const url = `${HAS_API_SUFFIX ? BASE : BASE + "/api"}/guilds/${guildId}/features`
  const r = await fetch(url, { cache: "no-store" })
  if (!r.ok) return { custom_groups: false, premium_members: false }
  const j = await r.json()
  return j.features || { custom_groups: false, premium_members: false }
}

export default async function GuildLayout(
  props: PropsWithChildren<{ params: Promise<{ id: string }> }>
) {
  const { id } = await props.params

  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/signin")
  }

  const guilds = await fetchGuilds(session.accessToken)
  const guild = guilds.find((g) => g.id === id)
  if (!guild) return notFound()

  const features = await fetchFeaturesSSR(id)
  const premium = Boolean(features.premium_members || features.custom_groups)

  const tabs = [
    { href: `/guilds/${guild.id}/users`, label: "Users" },
    ...(premium ? [{ href: `/guilds/${guild.id}/members`, label: "Members" }] : []),
    { href: `/guilds/${guild.id}/roles`, label: "Roles" },
  ]

  return (
    <main className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{guild.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-2xl md:text-3xl font-bold truncate">{guild.name}</h1>
            <p className="text-muted-foreground text-sm">Guild ID: {guild.id}</p>
          </div>
        </div>

        <div className="mt-6">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="w-full justify-start">
              {tabs.map((t) => (
                <TabsTrigger key={t.href} value={t.label.toLowerCase()} asChild>
                  <Link href={t.href}>{t.label}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-6">{props.children}</div>
      </div>
    </main>
  )
}
