import { NextResponse } from "next/server";

// GET /api/guilds
// Returns guilds the user belongs to, filtered to those where the bot is installed
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const botBaseRaw = process.env.SERVER_API_BASE_URL || "";
  const botBase = botBaseRaw.replace(/\/+$/, "");

  // Fetch user's guilds from Discord
  let userGuildsRes: Response;
  try {
    userGuildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to reach Discord" }, { status: 502 });
  }

  if (userGuildsRes.status === 429) {
    const retryAfter = userGuildsRes.headers.get("retry-after") || "5";
    return NextResponse.json(
      { error: "Rate limited by Discord" },
      { status: 429, headers: { "Retry-After": retryAfter } }
    );
  }
  if (!userGuildsRes.ok) {
    const body = await userGuildsRes.text();
    return NextResponse.json({ error: body || "Failed to fetch user guilds" }, { status: userGuildsRes.status });
  }
  const userGuilds = (await userGuildsRes.json()) as any[];

  // Fetch bot-installed guilds from the VPS bot API (if configured)
  let installedGuilds: any[] = [];
  if (botBase) {
    try {
      const botRes = await fetch(`${botBase}/api/guilds`, { cache: "no-store" });
      if (botRes.ok) {
        installedGuilds = (await botRes.json()) as any[];
      } else {
        // Non-fatal: continue with empty installed list
        console.warn("/api/guilds bot endpoint failed:", botRes.status);
      }
    } catch (err) {
      console.warn("/api/guilds bot endpoint unreachable:", (err as any)?.message || err);
    }
  }

  const installedSet = new Set(installedGuilds.map((g: any) => String(g.id || g.guildId || g.guild_id || "")));

  // Intersect user guilds with installed guilds
  const results = userGuilds
    .filter((g: any) => installedSet.has(String(g.id || "")))
    .map((g: any) => {
      const id = String(g.id);
      const installed = installedGuilds.find((x: any) => String(x.id || x.guildId || x.guild_id) === id) || {};

      // Prefer counts from bot API when available
      const memberCount =
        typeof installed.memberCount === "number"
          ? installed.memberCount
          : typeof installed.approximate_member_count === "number"
          ? installed.approximate_member_count
          : null;
      const roleCount =
        typeof installed.roleCount === "number"
          ? installed.roleCount
          : typeof installed.roles === "number"
          ? installed.roles
          : null;

      const icon = (g.icon as string | null) || null;
      const iconUrl = icon ? `https://cdn.discordapp.com/icons/${id}/${icon}.png` : null;

      return {
        id,
        name: String(g.name || ""),
        memberCount: memberCount ?? 0,
        roleCount: roleCount ?? 0,
        iconUrl,
        premium: Boolean(installed.premium || false),
        createdAt: null as string | null,
      };
    });

  return NextResponse.json(results);
}