"use client";

import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";

interface AdminTopbarProps {
	onMenuClick?: () => void;
}

export default function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
	const { data: session } = useSession();
	return (
		<header className="h-14 border-b flex items-center justify-between px-4 bg-background/80 backdrop-blur">
			<div className="flex items-center gap-3">
				{/* Mobile menu button */}
				<button
					onClick={onMenuClick}
					className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
					aria-label="Open navigation menu"
				>
					<Menu className="h-5 w-5" />
				</button>
				<div className="font-semibold">ServerMate Admin</div>
			</div>
			<div className="text-sm text-muted-foreground truncate max-w-[50%]">
				{session?.user?.name || (session as any)?.user?.username || ""}
			</div>
		</header>
	);
}


