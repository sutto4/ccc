"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import AdminSidebar from "@/components/admin-sidebar-new";
import AdminTopbar from "@/components/admin-topbar";
import { AuthErrorBoundary } from "@/components/auth-error-boundary";

export default function AdminLayout({ children }: PropsWithChildren) {
	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

	return (
		<AuthErrorBoundary>
			<div className="min-h-screen">
				{/* Desktop Sidebar */}
				<aside className="hidden md:block fixed left-0 top-0 h-screen w-[240px] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] z-20">
					<AdminSidebar />
				</aside>

				{/* Mobile Sidebar Drawer */}
				{isMobileNavOpen && (
					<div className="md:hidden">
						{/* Backdrop */}
						<div
							className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40"
							onClick={() => setIsMobileNavOpen(false)}
							aria-hidden
						/>
						{/* Drawer Panel */}
						<div className="fixed left-0 top-0 h-screen w-[240px] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] z-50 shadow-xl animate-in slide-in-from-left">
							<AdminSidebar />
						</div>
					</div>
				)}

				{/* Top bar - full width, on top */}
				<header className="fixed top-0 left-0 right-0 h-[72px] bg-[hsl(var(--header))] text-[hsl(var(--header-foreground))] border-b border-[hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--header))]/80 z-50">
					<AdminTopbar onMenuClick={() => setIsMobileNavOpen(true)} />
				</header>

				{/* Main content - responsive to sidebar presence */}
				<main className="md:ml-[240px] ml-0 pt-[72px] pl-4 pr-4 md:pr-6 pb-6 bg-background text-foreground overflow-x-hidden">
					<div className="w-full">{children}</div>
				</main>

				{/* Fixed Footer - responsive positioning */}
				<footer className="fixed bottom-0 md:left-[240px] left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
					<div className="px-4 py-1">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
							<div className="flex items-center gap-2">
								<span>© 2025 ServerMate. All rights reserved.</span>
							</div>

							<div className="flex items-center gap-3">
								<a
									href="https://discord.gg/nrSjZByddw"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-foreground transition-colors"
								>
									Support
								</a>
								<span className="opacity-60">v1.0.0</span>
							</div>
						</div>
					</div>
				</footer>

				{/* Sound Notifications for admin pages */}
			</div>
		</AuthErrorBoundary>
	);
}


