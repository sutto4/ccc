
"use client";
import dynamic from "next/dynamic";

import { useState } from "react";
const RoleKanban = dynamic(() => import("@/components/role-kanban"), { ssr: false });
const RoleExplorer = dynamic(() => import("@/components/role-explorer"), { ssr: false });

export default function RoleKanbanWrapper({ guildId, roles = [] }: { guildId: string, roles?: any[] }) {
  const [view, setView] = useState<'kanban' | 'class'>('kanban');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded font-medium border transition-colors ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setView('kanban')}
        >
          Kanban View
        </button>
        <button
          className={`px-4 py-2 rounded font-medium border transition-colors ${view === 'class' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setView('class')}
        >
          Role Explorer
        </button>
      </div>
      {view === 'kanban' ? (
        <RoleKanban guildId={guildId} />
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-4">Role Explorer</h2>
          <RoleExplorer guildId={guildId} roles={roles || []} />
        </>
      )}
    </div>
  );
}
