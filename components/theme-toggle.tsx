"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  // Theme toggle is disabled for now, but code is retained for future use
  // const { theme, setTheme } = useTheme();
  // const [mounted, setMounted] = useState(false);
  // useEffect(() => setMounted(true), []);

  return (
    <button
      aria-label="Toggle dark mode (disabled)"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border opacity-50 cursor-not-allowed"
      disabled
    >
      <Moon className="h-4 w-4" />
    </button>
  );
}
