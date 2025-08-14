// Temporary debug API route for Next.js to test environment and Discord API connectivity
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  return NextResponse.json({
    env: {
      DISCORD_BOT_TOKEN: botToken ? `set (${botToken.length} chars)` : "missing"
    }
  });
}
