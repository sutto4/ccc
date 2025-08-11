import { NextResponse } from "next/server"
import { getMockExternalGroups, getMockMembers } from "@/lib/data"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.toLowerCase() ?? ""
  const role = (url.searchParams.get("role") ?? "").split(",").filter(Boolean)
  const group = (url.searchParams.get("group") ?? "").split(",").filter(Boolean)

  let members = getMockMembers(params.id)

  if (q) {
    members = members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.discordUserId.includes(q) ||
        (m.accountid?.toLowerCase().includes(q) ?? false),
    )
  }

  if (role.length) {
    members = members.filter((m) => role.every((r) => m.roleIds.includes(r)))
  }

  if (group.length) {
    const ext = getMockExternalGroups()
    const accountIds = new Set(ext.filter((g) => group.includes(g.group)).map((g) => g.accountid))
    members = members.filter((m) => (m.accountid ? accountIds.has(m.accountid) : false))
  }

  return NextResponse.json(members)
}
