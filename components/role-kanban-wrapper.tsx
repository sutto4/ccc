
"use client";
import dynamic from "next/dynamic";

import { useState } from "react";
const RoleKanban = dynamic(() => import("@/components/role-kanban"), { ssr: false });
const RoleExplorer = dynamic(() => import("@/components/role-explorer"), { ssr: false });

export default function RoleKanbanWrapper({ guildId, roles = [] }: { guildId: string, roles?: any[] }) {
  return (
    <div>
      <RoleKanban guildId={guildId} />
    </div>
  );
}
