import Link from "next/link";
import type { PropsWithChildren } from "react";
import { notFound, redirect } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { fetchGuilds } from "@/lib/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { id: string };

export default async function GuildLayout(
  props: PropsWithChildren<{ params: Promise<Params> }>
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/signin");
  }

  // Next 15 wants params awaited
  const { id } = await props.params;

  const guilds = await fetchGuilds(session.accessToken as any);
  const guild = guilds.find((g) => g.id === id);
  if (!guild) return notFound();

  const tabs = [
    { href: `/guilds/${guild.id}/users`, label: "Users" },
    { href: `/guilds/${guild.id}/roles`, label: "Roles" },
    // add this back if you want it visible here:
    // { href: `/guilds/${guild.id}/members`, label: "Members" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
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
  );
}
