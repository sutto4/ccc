import { Star } from "lucide-react";

export default function GuildVIPBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-purple-400/20 text-purple-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-purple-400">
      <Star className="h-3 w-3 text-purple-500" /> VIP
    </span>
  );
}
