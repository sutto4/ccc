import ConsoleShell from "@/components/console-shell";

export default function GuildsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <ConsoleShell>{children}</ConsoleShell>;
}
