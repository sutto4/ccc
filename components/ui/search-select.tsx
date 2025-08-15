"use client";

import * as React from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

type Option = { value: string; label: string; iconUrl?: string | null; emoji?: string | null };

export function SearchSelect({
	label,
	options,
	value,
	onChange,
	placeholder = "Search…",
	triggerLabel = "Select",
}: {
	label?: string;
	options: Option[];
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	triggerLabel?: string;
}) {
	const [open, setOpen] = React.useState(false);
	const current = options.find(o => o.value === value);
	return (
		<div>
			<button type="button" className="w-full border rounded-md h-9 px-3 text-left bg-background hover:bg-accent" onClick={() => setOpen(true)}>
				{current ? current.label : triggerLabel}
			</button>
			<CommandDialog open={open} onOpenChange={setOpen} showCloseButton>
				<Command>
					{label && <div className="px-3 pt-3 text-xs text-muted-foreground">{label}</div>}
					<CommandInput placeholder={placeholder} />
					<CommandList>
						<CommandEmpty>No results.</CommandEmpty>
						<CommandGroup>
							{options.map(opt => (
								<CommandItem
									key={opt.value}
									onSelect={() => { onChange(opt.value); setOpen(false); }}
								>
									{opt.iconUrl ? (
										<img src={opt.iconUrl} alt="" className="w-4 h-4 rounded-sm" />
									) : opt.emoji ? (
										<span className="text-base leading-none">{opt.emoji}</span>
									) : null}
									<span className="truncate">{opt.label}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</CommandDialog>
		</div>
	);
}


