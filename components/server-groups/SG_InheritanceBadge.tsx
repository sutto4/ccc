"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Settings, AlertTriangle } from 'lucide-react';

interface SG_InheritanceBadgeProps {
  status: 'inherited' | 'overridden' | 'custom' | 'error';
  className?: string;
}

export function SG_InheritanceBadge({ status, className }: SG_InheritanceBadgeProps) {
  const variants = {
    inherited: {
      variant: 'secondary' as const,
      icon: CheckCircle,
      text: 'Inherited',
      className: 'text-green-700 bg-green-100 border-green-200'
    },
    overridden: {
      variant: 'outline' as const,
      icon: Settings,
      text: 'Overridden',
      className: 'text-blue-700 bg-blue-100 border-blue-200'
    },
    custom: {
      variant: 'default' as const,
      icon: Settings,
      text: 'Custom',
      className: 'text-purple-700 bg-purple-100 border-purple-200'
    },
    error: {
      variant: 'destructive' as const,
      icon: AlertTriangle,
      text: 'Error',
      className: 'text-red-700 bg-red-100 border-red-200'
    }
  };

  const config = variants[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`inline-flex items-center gap-1 ${config.className} ${className || ''}`}
    >
      <Icon className="h-3 w-3" />
      {config.text}
    </Badge>
  );
}

