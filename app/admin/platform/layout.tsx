import type { PropsWithChildren } from "react";

export default function PlatformLayout({ children }: PropsWithChildren) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Platform Management</h1>
        <p className="text-muted-foreground">
          Manage features, analytics, and system resources
        </p>
      </div>
      {children}
    </div>
  );
}
