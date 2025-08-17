"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Server, Settings } from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ComponentType<any> };

const ADMIN_ITEMS: NavItem[] = [
	{ href: "/admin", label: "Dashboard", icon: Shield },
	{ href: "/admin/guilds", label: "Guilds", icon: Settings },
];

export default function AdminSidebar() {
	const pathname = usePathname() || "";

	return (
		<aside className="h-full w-64 border-r bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))]">
			<div className="px-4 py-4 border-b">
				<div className="text-lg font-bold">Admin</div>
			</div>
			<nav className="p-2 space-y-1">
				{ADMIN_ITEMS.map(({ href, label, icon: Icon }) => {
					const active = pathname === href;
					return (
						<Link
							key={href}
							href={href}
							className={[
								"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
								active
									? "bg-[hsl(var(--sidebar-accent))] text-white"
									: "hover:bg-[hsl(var(--sidebar-hover))]",
							].join(" ")}
						>
							<Icon className="h-4 w-4" />
							<span className="truncate">{label}</span>
						</Link>
					);
				})}

				<div className="mt-3 pt-3 border-t" />
				<Link
					href="/guilds"
					className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-[hsl(var(--sidebar-hover))]"
					title="Back to My Servers"
				>
					<Server className="h-4 w-4" />
					<span>My Servers</span>
				</Link>
			</nav>
		</aside>
	);
}


