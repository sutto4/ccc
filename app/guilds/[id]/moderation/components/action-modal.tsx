"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ban, VolumeX, Clock, AlertTriangle } from "lucide-react";

export type ModAction = "ban" | "unban" | "kick" | "timeout" | "mute" | "unmute";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: ModAction;
  targetUserId?: string;
  targetUsername?: string;
}

const actionConfig = {
  ban: {
    title: "Ban User",
    description: "Permanently ban a user from the server",
    icon: Ban,
    color: "text-red-500",
    confirmText: "Ban User",
    destructive: true,
  },
  unban: {
    title: "Unban User",
    description: "Remove a user's ban from the server",
    icon: Ban,
    color: "text-green-500",
    confirmText: "Unban User",
    destructive: false,
  },
  kick: {
    title: "Kick User",
    description: "Remove a user from the server (they can rejoin)",
    icon: Ban, // Changed from Kick to Ban as Kick is no longer imported
    color: "text-orange-500",
    confirmText: "Kick User",
    destructive: true,
  },
  timeout: {
    title: "Timeout User",
    description: "Temporarily restrict a user's access",
    icon: Clock,
    color: "text-yellow-500",
    confirmText: "Timeout User",
    destructive: true,
  },
  mute: {
    title: "Mute User",
    description: "Prevent a user from sending messages",
    icon: VolumeX,
    color: "text-blue-500",
    confirmText: "Mute User",
    destructive: true,
  },
  unmute: {
    title: "Unmute User",
    description: "Restore a user's ability to send messages",
    icon: VolumeX,
    color: "text-green-500",
    confirmText: "Unmute User",
    destructive: false,
  },
};

export default function ActionModal({ isOpen, onClose, action, targetUserId, targetUsername }: ActionModalProps) {
  const [userId, setUserId] = useState(targetUserId || "");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("3600"); // 1 hour default for timeouts
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = actionConfig[action];
  const IconComponent = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setIsSubmitting(true);
    
    try {
      // TODO: Implement API call
      console.log(`Performing ${action} on user ${userId}`, { reason, duration });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Show success toast
      onClose();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setUserId(targetUserId || "");
    setReason("");
    setDuration("3600");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <IconComponent className={`h-5 w-5 ${config.color}`} />
            <span>{config.title}</span>
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID or Username</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID or @username"
              required
            />
            {targetUsername && (
              <p className="text-sm text-muted-foreground">
                Target: {targetUsername}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you taking this action?"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 characters
            </p>
          </div>

          {(action === "timeout" || action === "mute") && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 sm:text-sm"
              >
                <option value="300">5 minutes</option>
                <option value="900">15 minutes</option>
                <option value="3600">1 hour</option>
                <option value="14400">4 hours</option>
                <option value="86400">1 day</option>
                <option value="604800">1 week</option>
              </select>
            </div>
          )}

          <DialogFooter className="flex space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant={config.destructive ? "danger" : "primary"}
              disabled={isSubmitting || !userId.trim()}
            >
              {isSubmitting ? "Processing..." : config.confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
