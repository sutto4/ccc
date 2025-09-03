import type { PropsWithChildren } from "react";
import AdminSidebar from "@/components/admin-sidebar";
import AdminTopbar from "@/components/admin-topbar";
import { SoundNotification } from "@/components/sound-notification";

export default function AdminLayout({ children }: PropsWithChildren) {
	return (
		<div className="grid grid-cols-[16rem_1fr] grid-rows-[3.5rem_1fr] min-h-[calc(100vh-0px)]">
			<div className="row-span-2 border-r"><AdminSidebar /></div>
			<div className=""><AdminTopbar /></div>
			<main className="p-4">{children}</main>

			{/* Sound Notifications for admin pages */}
			<SoundNotification />
		</div>
	);
}


