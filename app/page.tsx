import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import SiteHeader from "@/components/site-header";
import InviteBotButton from "@/components/invite-bot-button";
import { fetchGuilds } from "@/lib/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Page() {
	const session = await getServerSession(authOptions);
	const guilds = session ? await fetchGuilds(session.accessToken) : [];

	if (!session) {
		return (
			<main className="min-h-[100dvh] bg-background">
				<SiteHeader />
				<section className="mx-auto max-w-6xl px-4 md:px-6 py-12">
					<h1 className="text-3xl font-bold mb-2">Welcome</h1>
					<p className="text-muted-foreground mb-6">Sign in with Discord to manage your guilds.</p>
					<Button asChild>
						<Link href="/signin">Sign in</Link>
					</Button>
				</section>
			</main>
		);
	}

	return (
		<main className="min-h-[100dvh] bg-background">
			<SiteHeader />
			<section className="mx-auto max-w-6xl px-4 md:px-6 py-8">
				<div className="flex items-center justify-between gap-4 mb-6">
					<div>
					 </div>
						<h1 className="text-2xl md:text-3xl font-bold">Your Guilds</h1>
						<p className="text-muted-foreground">Manage roles, users, premium and settings for your Discord servers.</p>
					<InviteBotButton />
				</div>

				<Suspense
					fallback={
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<Card key={i} className="border-dashed">
									<CardHeader>
										<Skeleton className="h-6 w-40" />
									</CardHeader>
									<CardContent className="space-y-3">
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-1/2" />
									</CardContent>
									<CardFooter>
										<Skeleton className="h-9 w-24" />
									</CardFooter>
								</Card>
							))}
						</div>
					}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{guilds.map((g) => {
							const memberCount = (g.memberCount ?? 0).toLocaleString();
							const roleCount = g.roleCount ?? g.rolesCount ?? 0;
							const icon = g.iconUrl ?? g.icon ?? "🛡️";
							const premium = Boolean(g.premium);

							return (
								<Card key={g.id} className={cn("relative overflow-hidden")}>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<span className="inline-flex size-8 rounded-md bg-muted items-center justify-center overflow-hidden">
												{typeof icon === "string" && icon.startsWith("http") ? (
													<img src={icon} alt="" className="w-8 h-8 object-cover" />
												) : (
													icon
												)}
											</span>
											<span className="truncate">{g.name}</span>
											{premium ? (
												<Badge variant="default" className="ml-auto flex items-center gap-1">
													<Sparkles className="w-3 h-3" /> Premium
												</Badge>
											) : (
												<Badge variant="secondary" className="ml-auto">
													Free
												</Badge>
											)}
										</CardTitle>
									</CardHeader>
									<CardContent className="text-sm text-muted-foreground space-y-2">
										<div className="flex items-center gap-2">
											<Users className="w-4 h-4" />
											<span>{memberCount} members</span>
										</div>
										<div className="flex items-center gap-2">
											<ShieldCheck className="w-4 h-4" />
											<span>Roles: {roleCount}</span>
										</div>
									</CardContent>
									<CardFooter className="flex gap-2">
										<Button asChild size="sm">
											<Link href={`/guilds/${g.id}/users`}>Users</Link>
										</Button>
										<Button asChild size="sm" variant="secondary">
											<Link href={`/guilds/${g.id}/roles`}>Roles</Link>
										</Button>
									</CardFooter>
								</Card>
							);
						})}
					</div>
				</Suspense>
			</section>
		</main>
	);
}
