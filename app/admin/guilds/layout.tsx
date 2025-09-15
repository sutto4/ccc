import type { PropsWithChildren } from "react";

export default function GuildManagementLayout({ children }: PropsWithChildren) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Guild Management</h1>
        <p className="text-muted-foreground">
          Manage Discord servers, settings, and bulk operations
        </p>
      </div>
      {children}
    </div>
  );
}
