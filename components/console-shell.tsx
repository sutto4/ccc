"use client";

import { PropsWithChildren, useState, useEffect } from "react";
import Sidebar from "@/components/ui/sidebar";
import Topbar from "@/components/ui/topbar";
import { WelcomeModal } from "@/components/welcome-modal";
import GettingStartedWidget from "@/components/getting-started-widget";
import { useSession } from "next-auth/react";

export default function ConsoleShell({ children }: PropsWithChildren) {
  const { data: session } = useSession();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [userGuilds, setUserGuilds] = useState<any[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);

  // Debug getting started state
  useEffect(() => {
    console.log('[CONSOLE-SHELL] Getting started state changed:', showGettingStarted);
  }, [showGettingStarted]);

  useEffect(() => {
    if (session?.user) {
      // Check if this is the user's first visit
      const hasVisited = localStorage.getItem('servermate-first-visit');

      // For testing: uncomment the next line to always show the modal
      // localStorage.removeItem('servermate-first-visit');

      if (!hasVisited) {
        setShowWelcomeModal(true);
        localStorage.setItem('servermate-first-visit', 'true');
      }

      // Only fetch guilds if we haven't already loaded them successfully
      // This prevents repeated failed requests
      if (userGuilds.length === 0) {
        console.log('ConsoleShell: Fetching user guilds for navigation...');
        fetch('/api/guilds')
          .then(res => {
            console.log('ConsoleShell: Guilds API response status:', res.status);
            if (!res.ok) {
              // Log the error but don't throw - just set empty guilds
              console.warn('ConsoleShell: Guilds API returned', res.status, '- skipping guild fetch');
              return res.text().then(text => {
                console.debug('ConsoleShell: Guilds API error details:', text);
                // Don't throw error, just return null to indicate failure
                return null;
              });
            }
            return res.json();
          })
          .then(data => {
            if (data && data.guilds) {
              console.log('ConsoleShell: Successfully loaded', data.guilds.length, 'guilds');
              setUserGuilds(data.guilds);
            } else if (data === null) {
              // API failed, set empty array
              console.log('ConsoleShell: Guilds API failed, using empty array');
              setUserGuilds([]);
            } else {
              console.log('ConsoleShell: No guilds found in response');
              setUserGuilds([]);
            }
          })
          .catch(err => {
            console.warn('ConsoleShell: Error fetching guilds, using empty array:', err.message);
            setUserGuilds([]); // Set empty array on error
          });
      }

      // Only check premium status if we haven't already
      if (!isPremium) {
        console.log('ConsoleShell: Checking premium status...');
        fetch('/api/user/premium-status')
          .then(res => {
            console.log('ConsoleShell: Premium API response status:', res.status);
            if (!res.ok) {
              // Log warning but don't fail - just use default
              console.warn('ConsoleShell: Premium API returned', res.status, '- using default false');
              return res.text().then(text => {
                console.debug('ConsoleShell: Premium API error details:', text);
                return null;
              });
            }
            return res.json();
          })
          .then(data => {
            if (data && typeof data.isPremium === 'boolean') {
              console.log('ConsoleShell: Premium status loaded:', data.isPremium);
              setIsPremium(data.isPremium);
            } else if (data === null) {
              // API failed, keep default
              console.log('ConsoleShell: Premium API failed, keeping default false');
              setIsPremium(false);
            } else {
              console.log('ConsoleShell: Invalid premium response, defaulting to false');
              setIsPremium(false);
            }
          })
          .catch(err => {
            console.warn('ConsoleShell: Error fetching premium status, using false:', err.message);
            setIsPremium(false); // Default to false on error
          });
      }
    }
  }, [session, userGuilds.length, isPremium]);

  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 h-screen w-[240px] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] z-20">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40"
            onClick={() => setIsMobileNavOpen(false)}
            aria-hidden
          />
          {/* Drawer Panel */}
          <div className="fixed left-0 top-0 h-screen w-[240px] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] z-50 shadow-xl animate-in slide-in-from-left">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Top bar - full width, on top */}
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-[hsl(var(--header))] text-[hsl(var(--header-foreground))] border-b border-[hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--header))]/80 z-50">
        <Topbar 
          onMenuClick={() => setIsMobileNavOpen(true)}
          onGettingStartedClick={() => {
            console.log('[CONSOLE-SHELL] Topbar getting started clicked');
            setShowGettingStarted(true);
          }}
        />
      </header>

      {/* Main content - responsive to sidebar presence */}
      <main className="md:ml-[240px] ml-0 pt-[72px] pl-4 pr-4 md:pr-6 pb-6 bg-background text-foreground overflow-x-hidden">
        <div className="w-full">{children}</div>
      </main>

      {/* Fixed Footer - positioned at bottom of page */}
      <footer className="fixed bottom-0 left-0 md:left-[240px] right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
        <div className="px-4 py-1">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>© 2025 ServerMate. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href="https://discord.gg/nrSjZByddw" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Support
              </a>
              <span className="opacity-60">v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userGuilds={userGuilds}
        isPremium={isPremium}
      />

      {/* Getting Started Widget */}
      <GettingStartedWidget 
        forceOpen={showGettingStarted}
        onOpenChange={setShowGettingStarted}
      />

      {/* Sound Notifications */}
    </div>
  );
}
