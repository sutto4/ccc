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
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import Image from "next/image";

type Params = { id: string };

export default async function GuildLayout(
  props: PropsWithChildren<{ params: Promise<Params> }>
) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  // Get access token from JWT (not session for security)
  const cookieStore = await cookies();
  const token = await getToken({ req: { cookies: cookieStore } as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) redirect("/signin");

  const { id } = await props.params;

  // Fetch guilds using the authenticated API route
  const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/guilds`, {
    headers: {
      'Cookie': cookieStore.toString(), // Pass cookies for authentication
    },
  });

  let guilds: any[] = [];
  if (response.ok) {
    const data = await response.json();
    guilds = data.guilds || [];
  }
  const guild = guilds.find((g) => g.id === id);

  // Log for debugging
  if (!guild) {
    console.log(`Guild ${id} not found. Available guilds:`, guilds.map(g => ({ id: g.id, name: g.name })));
    return notFound();
  }

  return (
    <div className="pl-4 pr-4 md:pr-6 md:pl-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {guild.iconUrl ? (
            <Image
              src={guild.iconUrl}
              alt={`${guild.name} icon`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {guild.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">{guild.name}</h1>
          <p className="text-muted-foreground text-sm">Guild ID: {guild.id}</p>
        </div>
      </div>
      <div>{props.children}</div>
    </div>
  );
}
