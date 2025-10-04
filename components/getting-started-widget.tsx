"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle, 
  Circle, 
  X, 
  ChevronRight, 
  Bot, 
  Settings, 
  Shield, 
  ToggleLeft, 
  FolderPlus, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  CheckIcon
} from "lucide-react";

// Icon mapping for dynamic icon rendering
const iconMap = {
  Bot,
  Settings,
  Shield,
  ToggleLeft,
  FolderPlus,
  MessageSquare,
  Sparkles,
  ExternalLink,
  CheckIcon
} as const;
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  href?: string;
  external?: boolean;
}

interface GettingStartedData {
  items: ChecklistItem[];
  totalCompleted: number;
  totalItems: number;
  dismissed: boolean;
}

interface GettingStartedWidgetProps {
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function GettingStartedWidget({ forceOpen, onOpenChange }: GettingStartedWidgetProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<GettingStartedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wasForceOpened, setWasForceOpened] = useState(false);

  // Extract guild ID from pathname
  const pathParts = pathname.split('/').filter(Boolean);
  const isInGuild = pathParts[0] === "guilds" && pathParts[1];
  const guildId = isInGuild ? pathParts[1] : null;

  useEffect(() => {
    if (session && guildId) {
      fetchGettingStartedData();
    }
  }, [session, guildId]);

  // Handle force open from user menu
  useEffect(() => {
    console.log('[GETTING-STARTED-WIDGET] Force open effect:', { forceOpen, hasData: !!data, dismissed: data?.dismissed });
    if (forceOpen && data) {
      console.log('[GETTING-STARTED-WIDGET] Forcing widget to open');
      setIsOpen(true);
      setWasForceOpened(true);
    }
  }, [forceOpen, data]);

  // Reset force open after a longer delay to allow rendering
  useEffect(() => {
    if (forceOpen) {
      const timer = setTimeout(() => {
        onOpenChange?.(false);
      }, 500); // Increased delay to allow widget to render
      return () => clearTimeout(timer);
    }
  }, [forceOpen, onOpenChange]);

  const fetchGettingStartedData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guilds/${guildId}/getting-started`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        
        // Auto-open if not dismissed and has incomplete items
        if (!result.dismissed && result.totalCompleted < result.totalItems) {
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch getting started data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (itemId: string) => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/getting-started`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action: 'complete' })
      });
      
      if (response.ok) {
        // Update local state immediately instead of refetching
        setData(prev => {
          if (!prev) return prev;
          
          const updatedItems = prev.items.map(item => 
            item.id === itemId ? { ...item, completed: true } : item
          );
          
          const totalCompleted = updatedItems.filter(item => item.completed).length;
          
          return {
            ...prev,
            items: updatedItems,
            totalCompleted,
            totalItems: prev.items.length
          };
        });
      }
    } catch (error) {
      console.error('Failed to mark item as completed:', error);
    }
  };

  const dismissWidget = async () => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/getting-started`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      });
      
      if (response.ok) {
        setData(prev => prev ? { ...prev, dismissed: true } : null);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to dismiss widget:', error);
    }
  };

  const reopenWidget = async () => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/getting-started`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' })
      });
      
      if (response.ok) {
        fetchGettingStartedData();
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Failed to reopen widget:', error);
    }
  };

  // Don't render if no session, not in guild, or loading
  if (!session || !guildId || !data || loading) {
    console.log('[GETTING-STARTED-WIDGET] Not rendering - basic conditions:', { hasSession: !!session, hasGuildId: !!guildId, hasData: !!data, loading });
    return null;
  }

  // Don't render if dismissed AND not being forced open
  if (data.dismissed && !forceOpen) {
    console.log('[GETTING-STARTED-WIDGET] Not rendering - dismissed:', { dismissed: data.dismissed, forceOpen });
    return null;
  }

  // Don't show if all items completed AND not being forced open AND wasn't force opened
  if (data.totalCompleted >= data.totalItems && !forceOpen && !wasForceOpened) {
    console.log('[GETTING-STARTED-WIDGET] Not rendering - all completed:', { totalCompleted: data.totalCompleted, totalItems: data.totalItems, forceOpen, wasForceOpened });
    return null;
  }

  const progressPercentage = (data.totalCompleted / data.totalItems) * 100;

  return (
    <>
      {/* Floating Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            aria-label="Open getting started checklist"
          >
            <Sparkles className="h-6 w-6" />
            {data.totalCompleted > 0 && (
              <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                {data.totalCompleted}
              </div>
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              Getting Started ({data.totalCompleted}/{data.totalItems})
            </div>
          </button>
        ) : (
          <div className="w-80 bg-white rounded-lg shadow-xl border border-gray-200 animate-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Getting Started</h3>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setWasForceOpened(false); // Reset force opened state when manually closed
                }}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Close checklist"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{data.totalCompleted} of {data.totalItems} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    data.totalCompleted >= data.totalItems 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              {data.totalCompleted >= data.totalItems && (
                <div className="mt-2 text-center">
                  <span className="text-sm font-medium text-green-600 flex items-center justify-center gap-1">
                    <CheckIcon className="h-4 w-4" />
                    All set! Great job! 🎉
                  </span>
                </div>
              )}
            </div>

            {/* Checklist Items */}
            <div className="max-h-96 overflow-y-auto">
              {data.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 border-b border-gray-100 last:border-b-0 ${
                    item.completed ? 'bg-green-50' : 'hover:bg-gray-50'
                  } transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => !item.completed && markAsCompleted(item.id)}
                      className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform cursor-pointer"
                      disabled={item.completed}
                    >
                      {item.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 hover:text-gray-500" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {(() => {
                          const IconComponent = iconMap[item.icon as keyof typeof iconMap];
                          return IconComponent ? (
                            <IconComponent className={`h-4 w-4 ${item.completed ? 'text-green-600' : 'text-gray-500'}`} />
                          ) : (
                            <div className={`h-4 w-4 rounded ${item.completed ? 'bg-green-600' : 'bg-gray-500'}`} />
                          );
                        })()}
                        <h4 className={`text-sm font-medium ${item.completed ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                      
                      {item.href && !item.completed && (
                        <div className="flex items-center gap-2">
                          {item.external ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {item.href.includes('discord.gg') ? 'Join Discord' : 'Open'}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <Link
                              href={item.href}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Go to {item.title}
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                {data.totalCompleted >= data.totalItems ? (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/guilds/${guildId}/getting-started`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'reset' })
                        });
                        
                        if (response.ok) {
                          fetchGettingStartedData(); // Refresh data
                        }
                      } catch (error) {
                        console.error('Failed to reset progress:', error);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Reset Progress
                  </button>
                ) : (
                  <button
                    onClick={dismissWidget}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Don't show again
                  </button>
                )}
                <div className="text-xs text-gray-500">
                  {progressPercentage.toFixed(0)}% complete
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
