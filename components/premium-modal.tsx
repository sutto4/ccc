"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Crown } from "lucide-react";

export default function PremiumModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <Crown className="h-5 w-5 text-yellow-500" /> Unlock Premium Features
          </DialogTitle>
          <DialogDescription>
            Upgrade to premium to access this feature and more:
          </DialogDescription>
        </DialogHeader>
        <ul className="my-4 space-y-2 text-sm">
          <li>• FiveM ESX & QBcore Integrations</li>
          <li>• Reaction Roles</li>
          <li>• Custom Commands</li>
          <li>• Donator Sync</li>
          <li>• And more coming soon!</li>
        </ul>
        <DialogFooter>
          <a
            href="/premium"
            className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-4 py-2 font-bold text-white shadow hover:bg-yellow-600 transition"
          >
            Upgrade Now
          </a>
          <DialogClose className="ml-2 px-4 py-2 rounded-md border text-sm">Maybe Later</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
