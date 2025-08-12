
"use client";
import RolesAndGroups from "@/components/RolesAndGroups";

export default function RolesPage({ params }: { params: { id: string } }) {
  const guildId = params.id;
  return <RolesAndGroups guildId={guildId} />;
}
