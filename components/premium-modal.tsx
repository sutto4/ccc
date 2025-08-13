"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Crown } from "lucide-react";

export default function PremiumModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-xl shadow-xl p-6 w-full max-w-md mx-auto backdrop-blur-md border border-gray-200"
        style={{
          background: 'rgba(255,255,255,0.35)',
          color: '#111827',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)'
        }}
      >
        <DialogTitle className="flex items-center gap-2 text-yellow-600 text-lg font-semibold mb-2">
          <Crown className="h-5 w-5 text-yellow-500" /> Unlock Premium Features
        </DialogTitle>
        <DialogDescription className="mb-2">
          Upgrade to premium to access this feature and more:
        </DialogDescription>
        <ul className="my-4 space-y-2 text-sm">
          <li>• FiveM ESX & QBcore Integrations</li>
          <li>• Reaction Roles</li>
          <li>• Custom Commands</li>
          <li>• Donator Sync</li>
          <li>• And more coming soon!</li>
        </ul>
        <div className="flex-shrink-0 w-32 h-32 mx-auto flex items-center justify-center mb-4">
          <img
            src="/placeholder-logo.png"
            alt="Premium illustration"
            className="w-full h-full object-contain rounded-lg shadow"
            loading="lazy"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <a
            href="/premium"
            className="flex-1 rounded bg-yellow-500 px-4 py-2 font-bold text-white shadow hover:bg-yellow-600 transition text-center"
          >
            Upgrade Now
          </a>
          <DialogClose className="flex-1 rounded border py-2 text-sm font-semibold hover:bg-gray-100 text-gray-700 border-gray-300 transition text-center">Maybe Later</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
