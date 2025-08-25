"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, CheckCircle } from "lucide-react";

interface PropagateActionBarProps {
  enabled: boolean;
  alreadyPropagated: boolean;
  onPropagate: () => Promise<void>;
  isPartOfGroup: boolean;
}

export default function PropagateActionBar({
  enabled,
  alreadyPropagated,
  onPropagate,
  isPartOfGroup
}: PropagateActionBarProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPropagating, setIsPropagating] = useState(false);

  const handlePropagate = async () => {
    setIsPropagating(true);
    try {
      await onPropagate();
      setShowConfirmDialog(false);
    } finally {
      setIsPropagating(false);
    }
  };

  if (!isPartOfGroup) {
    return null;
  }

  if (!enabled) {
    return null;
  }

  if (alreadyPropagated) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Already Propagated</span>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setShowConfirmDialog(true)}
        className="flex items-center space-x-2"
      >
        <Shield className="h-4 w-4" />
        <span>Propagate Now</span>
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>Propagate Case</span>
            </DialogTitle>
            <DialogDescription>
              This will propagate this moderation case to all linked guilds with ban sync enabled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Case will be sent to all linked guilds</li>
                <li>• Each guild will process based on their sync mode</li>
                <li>• Review mode guilds will require approval</li>
                <li>• Auto mode guilds will enforce immediately</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handlePropagate}
              disabled={isPropagating}
            >
              {isPropagating ? "Propagating..." : "Propagate Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
