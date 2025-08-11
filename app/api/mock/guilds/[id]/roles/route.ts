import { NextResponse } from "next/server"
import { getMockRoles } from "@/lib/data"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(getMockRoles(params.id))
}
