import { NextResponse } from "next/server";
import { AuthMiddleware } from "@/lib/auth-middleware";

// GET /api/guilds/[id]/channels - list text/news channels for channel selector
export const GET = AuthMiddleware.withAuth(async (_req, { params }: { params: Promise<{ id: string }> }, auth) => {
  const { id: guildId } = await params;
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Discord error ${res.status}: ${body}` }, { status: 502 });
    }
    const channels = await res.json();
    // Text: 0, News: 5, Forum 15 (optional)
    const allowed = new Set([0, 5, 15]);
    const mapped = (channels as any[])
      .filter((c) => allowed.has(Number(c.type)))
      .map((c) => ({ id: c.id, name: c.name, type: c.type }));
    return NextResponse.json({ channels: mapped });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch channels" }, { status: 500 });
  }
});
