import React from "react";

export default function GuildSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Guild Settings</h1>
      <div className="bg-card rounded-lg shadow p-4">
        {children}
      </div>
    </div>
  );
}
