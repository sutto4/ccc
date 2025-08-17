"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldIcon, SettingsIcon } from "lucide-react";

export default function GuildSettingsGeneralPage() {
  const params = useParams<{ id: string }>();
  const guildId = params.id;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">General Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your server's configuration and permissions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Role Permissions Card */}
        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-3 mb-4">
            <ShieldIcon className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-medium">Role Permissions</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Control which roles can access and use this app. Server owners always have full access.
          </p>
          <Link href={`/guilds/${guildId}/role-permissions`}>
            <Button className="w-full">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Manage Permissions
            </Button>
          </Link>
        </div>

        {/* More settings cards can be added here */}
        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="w-6 h-6 text-gray-600" />
            <h3 className="text-lg font-medium">More Settings</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Additional server configuration options will be available here.
          </p>
          <Button variant="outline" className="w-full" disabled>
            Coming Soon
          </Button>
        </div>
      </div>
    </div>
  );
}
