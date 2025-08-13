import { CheckCircle2 } from "lucide-react";

export default function GuildSelectedBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-500/20 text-blue-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-blue-400">
      <CheckCircle2 className="h-3 w-3 text-blue-500" /> Selected
    </span>
  );
}
