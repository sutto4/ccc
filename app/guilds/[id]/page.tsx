"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GuildPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params?.id as string;

  useEffect(() => {
    // Redirect to users page by default, or you can create a dashboard/overview page
    if (guildId) {
      router.replace(`/guilds/${guildId}/users`);
    }
  }, [guildId, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading guild...</p>
      </div>
    </div>
  );
}
