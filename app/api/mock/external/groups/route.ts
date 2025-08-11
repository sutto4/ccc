import { NextResponse } from "next/server"
import { getMockExternalGroups } from "@/lib/data"

export async function GET() {
  return NextResponse.json(getMockExternalGroups())
}
