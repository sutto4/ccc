import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9]{5,20}$/.test(String(id))) {
    return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const base = env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
  if (!base) {
    return NextResponse.json(
      { error: "SERVER_API_BASE_URL not configured on the web app" },
      { status: 501 }
    );
  }

  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.discordId || (session as any)?.user?.id || undefined;
  const username = session?.user?.name || undefined;

  try {
    const upstream = await fetch(`${base}/guilds/${id}/reaction-roles/publish-menu`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(userId ? { "x-user-id": String(userId) } : {}),
        ...(username ? { "x-user-name": String(username) } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: text || `Upstream error ${upstream.status}` },
        { status: upstream.status }
      );
    }
    try { return NextResponse.json(JSON.parse(text)); }
    catch { return NextResponse.json({ ok: true }); }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Proxy failed" }, { status: 502 });
  }
}


