"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "next-auth/react";

interface Guild {
  id: string;
  name: string;
  icon_url?: string | null;
  premium: boolean;
  member_count?: number;
}

interface ServerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedGuildIds: string[]) => void;
  planType: 'solo' | 'squad' | 'enterprise';
  maxServers: number;
  currentAllocation?: string[];
  title?: string;
}

export default function ServerSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  planType,
  maxServers,
  currentAllocation = [],
  title
}: ServerSelectionModalProps) {
  const { data: session } = useSession();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>(currentAllocation);
  const [loading, setLoading] = useState(false);
  const prevAllocationRef = useRef<string[]>(currentAllocation);

  useEffect(() => {
    if (isOpen && session) {
      fetchUserGuilds();
    }
  }, [isOpen, session]);

  useEffect(() => {
    // Only update if currentAllocation actually changed
    if (JSON.stringify(currentAllocation) !== JSON.stringify(prevAllocationRef.current)) {
      setSelectedGuilds(currentAllocation);
      prevAllocationRef.current = currentAllocation;
    }
  }, [currentAllocation]);

  // Initialize selectedGuilds when modal opens
  useEffect(() => {
    if (isOpen && currentAllocation) {
      setSelectedGuilds(currentAllocation);
      prevAllocationRef.current = currentAllocation;
    }
  }, [isOpen]);

  const fetchUserGuilds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/guilds');
      if (response.ok) {
        const data = await response.json();
        // The API returns an array directly, not wrapped in a 'guilds' property
        setGuilds(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuildToggle = (guildId: string) => {
    if (planType === 'solo') {
      // Solo plan: only one server can be selected
      setSelectedGuilds([guildId]);
    } else {
      // Squad/Enterprise: multiple servers can be selected
      setSelectedGuilds(prev => {
        if (prev.includes(guildId)) {
          return prev.filter(id => id !== guildId);
        } else {
          if (prev.length < maxServers) {
            return [...prev, guildId];
          }
          return prev;
        }
      });
    }
  };

  const handleConfirm = () => {
    if (selectedGuilds.length === 0) return;
    onConfirm(selectedGuilds);
    onClose();
  };

  const getPlanDescription = () => {
    switch (planType) {
      case 'solo':
        return 'Select 1 server for premium features';
      case 'squad':
        return `Select up to ${maxServers} servers for premium features`;
      case 'enterprise':
        return `Select up to ${maxServers} servers for premium features`;
      default:
        return 'Select servers for premium features';
    }
  };

  const isGuildSelected = (guildId: string) => selectedGuilds.includes(guildId);
  const canSelectMore = selectedGuilds.length < maxServers;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {title || `Allocate ${planType.charAt(0).toUpperCase() + planType.slice(1)} Subscription`}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getPlanDescription()}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {guilds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No servers found. Make sure you have the bot added to at least one server.
                </div>
              ) : (
                guilds.map((guild) => (
                  <div
                    key={guild.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isGuildSelected(guild.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {guild.icon_url ? (
                        <img
                          src={guild.icon_url}
                          alt={guild.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-lg font-semibold text-muted-foreground">
                            {guild.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{guild.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {guild.member_count ? `${guild.member_count} members` : 'Unknown members'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {guild.premium && (
                        <Badge variant="secondary" className="text-xs">
                          Already Premium
                        </Badge>
                      )}
                      
                      <Checkbox
                        checked={isGuildSelected(guild.id)}
                        onChange={() => handleGuildToggle(guild.id)}
                        disabled={!guild.premium && !canSelectMore && !isGuildSelected(guild.id)}
                      />
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {planType !== 'solo' && (
              <span>
                {selectedGuilds.length} of {maxServers} servers selected
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedGuilds.length === 0}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
