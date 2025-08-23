"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface InlineEditorProps {
  title: string;
  description: string;
  color: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onColorChange: (value: string) => void;
  showTimestamp?: boolean;
  children?: React.ReactNode;
}

export default function InlineEditor({
  title,
  description,
  color,
  onTitleChange,
  onDescriptionChange,
  onColorChange,
  showTimestamp = true,
  children
}: InlineEditorProps) {
  return (
    <div className="space-y-4">
      {/* Inline editor only */}
      <div className="flex items-center justify-between mb-0">
        <label className="block text-sm font-medium">Embed Editor</label>
      </div>

      {/* Preview container */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2" />
        <div className="rounded-lg border bg-background p-3">
          {/* Simulated Discord message container */}
          <div className="flex items-start gap-3">
            {/* Circular color picker trigger */}
            <button
              type="button"
              onClick={() => onColorChange(color)}
              className="relative h-9 w-9 rounded-full border-2 border-border cursor-pointer overflow-hidden shadow-sm hover:shadow transition"
              title="Set embed color"
            >
              <span
                className="absolute inset-0 rounded-full"
                style={{ backgroundImage: 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
              />
              <span
                className="absolute inset-1 rounded-full border"
                style={{ backgroundColor: color }}
              />
            </button>
            <div className="min-w-0 flex-1">
              {/* Username + timestamp */}
              <div className="mb-1 text-sm flex items-center gap-3">
                <span className="font-semibold">ServerMate Bot</span>
                {showTimestamp && (
                  <span className="ml-2 text-xs text-muted-foreground">Just now</span>
                )}
              </div>

              {/* Embed card */}
              <div className="relative rounded-md border bg-card p-3" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                {/* Author row */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 w-[24rem]">
                  <Input 
                    value={title} 
                    onChange={e => onTitleChange(e.target.value)} 
                    placeholder="Embed title" 
                    className="font-semibold leading-snug mb-2 w-[24rem]" 
                  />
                </div>

                {/* Title / Description */}
                <Textarea 
                  value={description} 
                  onChange={e => onDescriptionChange(e.target.value)} 
                  placeholder="Embed description" 
                  rows={2} 
                  className="text-sm whitespace-pre-wrap text-muted-foreground" 
                />

                {/* Custom content */}
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

