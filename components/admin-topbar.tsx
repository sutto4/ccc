"use client";

import { useSession } from "next-auth/react";

export default function AdminTopbar() {
	const { data: session } = useSession();
	return (
		<header className="h-14 border-b flex items-center justify-between px-4 bg-background/80 backdrop-blur">
			<div className="font-semibold">ServerMate Admin</div>
			<div className="text-sm text-muted-foreground truncate max-w-[50%]">
				{session?.user?.name || (session as any)?.user?.username || ""}
			</div>
		</header>
	);
}


