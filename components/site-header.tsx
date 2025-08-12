"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import AuthButtons from "@/components/auth-buttons";

export default function SiteHeader() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark");
  const nextTheme = isDark ? "light" : "dark";

  return (
    <header className="border-b sticky top-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
      <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            Discord Server Manager
          </Link>
          <nav className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link
              href="https://docs.example.com"
              className="hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              Docs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle dark mode"
              onClick={() => setTheme(nextTheme)}
              title={isDark ? "Switch to light" : "Switch to dark"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          )}
          <AuthButtons />
          <Avatar className="size-8">
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
