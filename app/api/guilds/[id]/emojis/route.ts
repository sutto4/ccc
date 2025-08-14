
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const guildId = context.params.id;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Missing bot token" }, { status: 500 });
  }
  // Timeout after 8 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res;
  try {
    res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
      return NextResponse.json({ error: "Discord emojis API timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: (err && typeof err === 'object' && 'message' in err) ? err.message : "Unknown error" }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const errText = await res.text();
    console.error("Discord emojis API error:", errText);
    return NextResponse.json({ error: errText || "Failed to fetch emojis from Discord" }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json({ emojis: data });
}
