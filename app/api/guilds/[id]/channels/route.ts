import { NextResponse } from "next/server";

export async function GET(req: Request, context: any) {
  // Next.js may pass params as a Promise in some dynamic API contexts
  let guildId;
  if (context && typeof context.params?.then === 'function') {
    const awaited = await context.params;
    guildId = awaited.id;
  } else {
    guildId = context.params?.id;
  }
  const discordBotToken = process.env.DISCORD_BOT_TOKEN;
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${discordBotToken}`,
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }
    const channels = await res.json();
    return NextResponse.json({ channels });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
