import { NextResponse } from "next/server"
import { getMockGuildById } from "@/lib/data"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const g = getMockGuildById(params.id)
  if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(g)
}
