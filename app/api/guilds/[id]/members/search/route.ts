import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";

// GET /api/guilds/[id]/members/search?q=username - search for Discord members by username
export const GET = withAuth(async (req, { params }: { params: { id: string } }) => {
  const guildId = params.id;
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Search query must be at least 2 characters" }, { status: 400 });
  }

  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    // First, get guild members (this requires the bot to have the GUILD_MEMBERS intent)
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Discord error ${res.status}: ${body}` }, { status: 502 });
    }

    const members = await res.json();
    
    // Filter members by username/display name (case-insensitive)
    const filteredMembers = members
      .filter((member: any) => {
        const username = member.user?.username?.toLowerCase() || '';
        const displayName = member.nick?.toLowerCase() || '';
        const queryLower = query.toLowerCase();
        
        return username.includes(queryLower) || displayName.includes(queryLower);
      })
      .slice(0, 10) // Limit to 10 results
      .map((member: any) => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.nick || member.user.username,
        avatar: member.user.avatar,
      }));

    return NextResponse.json({ members: filteredMembers });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to search members" }, { status: 500 });
  }
});
