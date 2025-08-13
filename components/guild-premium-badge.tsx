import { Crown } from "lucide-react";

export default function GuildPremiumBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-yellow-400/20 text-yellow-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-yellow-400">
      <Crown className="h-3 w-3 text-yellow-500" /> Premium
    </span>
  );
}
