"use client";

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface SG_LimitMeterProps {
  current: number;
  limit: number;
  type: 'servers' | 'rules' | 'managers' | 'announcements';
  className?: string;
}

export function SG_LimitMeter({ current, limit, type, className }: SG_LimitMeterProps) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const typeLabels = {
    servers: 'Servers',
    rules: 'Rules',
    managers: 'Managers',
    announcements: 'Announcements'
  };

  const getStatusColor = () => {
    if (isAtLimit) return 'text-red-600';
    if (isNearLimit) return 'text-amber-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{typeLabels[type]}</span>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${getStatusColor()}`}>
            {current} / {limit}
          </span>
          {isAtLimit ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : isNearLimit ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>
      <Progress 
        value={percentage} 
        className="h-2"
        style={{
          '--progress-background': getProgressColor()
        } as React.CSSProperties}
      />
      {isNearLimit && (
        <p className="text-xs text-amber-600">
          {isAtLimit 
            ? `You've reached the ${typeLabels[type].toLowerCase()} limit for your plan.`
            : `You're approaching the ${typeLabels[type].toLowerCase()} limit for your plan.`
          }
        </p>
      )}
    </div>
  );
}

