"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronRight, FolderOpen, Folder, Plus, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import GuildPremiumBadge from "@/components/guild-premium-badge";
import GuildVIPBadge from "@/components/guild-vip-badge";

interface Guild {
	id: string;
	name: string;
	memberCount: number | undefined;
	roleCount: number | undefined;
	iconUrl: string | null;
	premium: boolean;
	group?: {
		id: number;
		name: string;
		description: string;
	} | null;
}

interface ServerGroupsDisplayProps {
	guilds: Guild[];
}

export default function ServerGroupsDisplay({ guilds }: ServerGroupsDisplayProps) {
	const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
	const [expandedUngrouped, setExpandedUngrouped] = useState(false);

	// Group guilds by their group
	const groupedGuilds = guilds.reduce((acc, guild) => {
		if (guild.group) {
			if (!acc[guild.group.id]) {
				acc[guild.group.id] = {
					group: guild.group,
					guilds: []
				};
			}
			acc[guild.group.id].guilds.push(guild);
		} else {
			if (!acc.ungrouped) {
				acc.ungrouped = {
					group: null,
					guilds: []
				};
			}
			acc.ungrouped.guilds.push(guild);
		}
		return acc;
	}, {} as Record<string | number, { group: any; guilds: Guild[] }>);

	const toggleGroup = (groupId: number) => {
		const newExpanded = new Set(expandedGroups);
		if (newExpanded.has(groupId)) {
			newExpanded.delete(groupId);
		} else {
			newExpanded.add(groupId);
		}
		setExpandedGroups(newExpanded);
	};

	const toggleUngrouped = () => {
		setExpandedUngrouped(!expandedUngrouped);
	};

	const renderGuildCard = (guild: Guild) => (
		<Link key={guild.id} href={`/guilds/${guild.id}/users`} className="block group">
			<div className="relative rounded-lg border bg-card p-4 hover:shadow-md transition-shadow ml-6">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						{guild.iconUrl ? (
							<Image
								src={guild.iconUrl}
								alt={guild.name}
								width={40}
								height={40}
								className="rounded-lg"
							/>
						) : (
							<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
								<span className="text-sm font-semibold text-muted-foreground">
									{guild.name.charAt(0).toUpperCase()}
								</span>
							</div>
						)}
						<div>
							<h4 className="font-medium group-hover:text-primary transition-colors">
								{guild.name}
							</h4>
							<p className="text-xs text-muted-foreground">
								{guild.memberCount?.toLocaleString() || 'N/A'} members • {guild.roleCount?.toLocaleString() || 'N/A'} roles
							</p>
							<p className="text-[10px] text-muted-foreground/70">ID: {guild.id}</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{guild.premium && <GuildPremiumBadge />}
					</div>
				</div>
			</div>
		</Link>
	);

	return (
		<div className="space-y-4">
			{/* Grouped Servers */}
			{Object.entries(groupedGuilds).map(([key, { group, guilds: groupGuilds }]) => {
				if (key === 'ungrouped') return null;
				const isExpanded = expandedGroups.has(group.id);
				return (
					<Card key={group.id} className="border-2 border-blue-100 bg-blue-50/30">
						<CardHeader 
							title={
								<div className="flex items-center justify-between text-lg">
									<div className="flex items-center gap-3">
										<button
											onClick={() => toggleGroup(group.id)}
											className="flex items-center gap-2 hover:text-blue-600 transition-colors"
										>
											{isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
											<FolderOpen className="h-5 w-5 text-blue-600" />
											<span className="font-semibold text-blue-800">{group.name}</span>
											<span className="text-sm font-normal text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
												{groupGuilds.length} server{groupGuilds.length !== 1 ? 's' : ''}
											</span>
										</button>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={(e) => {
												e.preventDefault();
												// TODO: Navigate to group management
											}}
											className="text-xs"
										>
											<Settings className="h-3 w-3 mr-1" />
											Manage
										</Button>
									</div>
								</div>
							}
							subtitle={
								group.description && (
									<p className="text-sm text-blue-700 ml-10">{group.description}</p>
								)
							}
						/>
						{isExpanded && (
							<CardContent className="pt-0">
								<div className="space-y-2">
									{groupGuilds.map(renderGuildCard)}
								</div>
							</CardContent>
						)}
					</Card>
				);
			})}

			{/* Ungrouped Servers */}
			{groupedGuilds.ungrouped && groupedGuilds.ungrouped.guilds.length > 0 && (
				<Card className="border-2 border-gray-200 bg-gray-50/30">
					<CardHeader 
						title={
							<div className="flex items-center justify-between text-lg">
								<div className="flex items-center gap-3">
									<button
										onClick={toggleUngrouped}
										className="flex items-center gap-2 hover:text-gray-600 transition-colors"
									>
										{expandedUngrouped ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
										<Folder className="h-5 w-5 text-gray-600" />
										<span className="font-semibold text-gray-800">Individual Servers</span>
										<span className="text-sm font-normal text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
											{groupedGuilds.ungrouped.guilds.length} server{groupedGuilds.ungrouped.guilds.length !== 1 ? 's' : ''}
										</span>
									</button>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={(e) => {
										e.preventDefault();
										// TODO: Navigate to group creation
									}}
									className="text-xs"
								>
									<Plus className="h-3 w-3 mr-1" />
									Create Group
								</Button>
							</div>
						}
					/>
					{expandedUngrouped && (
						<CardContent className="pt-0">
							<div className="space-y-2">
								{groupedGuilds.ungrouped.guilds.map(renderGuildCard)}
							</div>
						</CardContent>
					)}
				</Card>
			)}
		</div>
	);
}
