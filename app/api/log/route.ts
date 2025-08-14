import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

let logs: any[] = [];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ip = req.headers.get("x-forwarded-for") || "";
  const body = await req.json();
  const entry = {
    ...body,
    ip,
    user: body.user || { id: session.user?.id, username: session.user?.name },
    timestamp: body.timestamp || new Date().toISOString(),
  };
  logs.push(entry);
  if (logs.length > 2000) logs = logs.slice(-2000);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ logs });
}