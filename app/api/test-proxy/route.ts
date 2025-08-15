import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "This is the Next.js API, not the bot proxy",
    timestamp: new Date().toISOString()
  });
}

