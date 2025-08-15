// Debug route removed for security. Return 404.
import { NextResponse } from "next/server";

<<<<<<< Current (Your changes)
export async function GET(req: NextRequest) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  return NextResponse.json({
    env: {
      DISCORD_BOT_TOKEN: botToken ? `set (${botToken.length} chars)` : "missing"
    }
  });
=======
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
>>>>>>> Incoming (Background Agent changes)
}
