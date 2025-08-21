import React from "react";

export default function GuildSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl p-6">
      <div className="bg-card rounded-lg shadow p-4">
        {children}
      </div>
    </div>
  );
}
