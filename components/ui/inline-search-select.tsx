"use client";

import * as React from "react";

type Option = { value: string; label: string; iconUrl?: string | null; emoji?: string | null };

export function InlineSearchSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const current = React.useMemo(() => options.find(o => o.value === value) || null, [options, value]);
  const [query, setQuery] = React.useState<string>(current?.label ?? "");

  React.useEffect(() => {
    setQuery(current?.label ?? "");
  }, [current?.label]);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-white/60 bg-white/90 text-black backdrop-blur-lg shadow-xl">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.value}
              className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted"
              onClick={() => { onChange(opt.value); setQuery(opt.label); setOpen(false); }}
              type="button"
            >
              {opt.iconUrl ? (
                <img src={opt.iconUrl} alt="" className="w-4 h-4 rounded-sm" />
              ) : opt.emoji ? (
                <span className="text-base leading-none">{opt.emoji}</span>
              ) : null}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


