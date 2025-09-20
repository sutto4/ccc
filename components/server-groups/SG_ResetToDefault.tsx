"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface SG_ResetToDefaultProps {
  onReset: () => void;
  itemName: string;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function SG_ResetToDefault({ 
  onReset, 
  itemName, 
  variant = 'button',
  size = 'sm',
  disabled = false 
}: SG_ResetToDefaultProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  if (variant === 'icon') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reset to Group Default
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset <strong>{itemName}</strong> to the group default settings? 
              This will remove any custom overrides and use the inherited configuration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset to Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={disabled}
          className="text-gray-600 hover:text-gray-800"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Default
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reset to Group Default
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to reset <strong>{itemName}</strong> to the group default settings? 
            This will remove any custom overrides and use the inherited configuration.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReset}>
            Reset to Default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

