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
import mysql from 'mysql2/promise';

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

  // Quick permission check using server_access_control table
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'chester_bot',
  });

  let hasAccess = false;
  try {
    // Check server_access_control first (same as guilds API)
    const [accessRows] = await connection.execute(
      'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
      [id, token.sub]
    );

    hasAccess = (accessRows as any[]).length > 0;

    if (!hasAccess) {
      // Also try with discordId if available from token
      const discordId = token.sub; // JWT sub should be Discord ID
      const [accessRows2] = await connection.execute(
        'SELECT has_access FROM server_access_control WHERE guild_id = ? AND user_id = ? AND has_access = 1',
        [id, discordId]
      );

      hasAccess = (accessRows2 as any[]).length > 0;
    }
  } finally {
    await connection.end();
  }

  if (!hasAccess) {
    console.log(`[GUILD_LAYOUT] Access denied for guild ${id}, user ${token.sub}`);
    redirect("/guilds");
  }

  // If access granted, fetch guild info
  const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/guilds`, {
    headers: {
      'Cookie': cookieStore.toString(),
    },
  });

  let guilds: any[] = [];
  if (response.ok) {
    const data = await response.json();
    guilds = data.guilds || [];
  }

  const guild = guilds.find((g) => g.id === id);

  // If guild not in list (shouldn't happen if permissions are correct), redirect
  if (!guild) {
    console.log(`[GUILD_LAYOUT] Guild ${id} access granted but not in guilds list`);
    redirect("/guilds");
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
