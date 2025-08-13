import Link from "next/link";
import type { PropsWithChildren } from "react";
import { notFound, redirect } from "next/navigation";
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
  if (!session) redirect("/signin");

  const { id } = await props.params;

  const guilds = await fetchGuilds(session.accessToken as any);
  const guild = guilds.find((g) => g.id === id);
  if (!guild) return notFound();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">{guild.name}</h1>
          <p className="text-muted-foreground text-sm">Guild ID: {guild.id}</p>
        </div>
      </div>
      <div>{props.children}</div>
    </div>
  );
}
