"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';

interface SG_PremiumGateProps {
  children: React.ReactNode;
  requiredTier: 'free' | 'premium' | 'enterprise';
  currentTier: 'free' | 'premium' | 'enterprise';
  feature?: string;
}

export function SG_PremiumGate({ 
  children, 
  requiredTier, 
  currentTier, 
  feature = 'this feature' 
}: SG_PremiumGateProps) {
  // Define tier hierarchy
  const tierLevels = { free: 0, premium: 1, enterprise: 2 };
  const currentLevel = tierLevels[currentTier];
  const requiredLevel = tierLevels[requiredTier];

  // If user has sufficient access, show content
  if (currentLevel >= requiredLevel) {
    return <>{children}</>;
  }

  // Show upgrade prompt
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="text-center py-12">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {requiredTier === 'premium' ? (
            <Crown className="h-8 w-8 text-amber-600" />
          ) : (
            <Lock className="h-8 w-8 text-amber-600" />
          )}
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {requiredTier === 'premium' ? 'Premium Feature' : 'Enterprise Feature'}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {feature} requires a {requiredTier} subscription. Upgrade to access advanced server group management features.
        </p>
        <div className="space-y-3">
          <Button className="w-full sm:w-auto">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to {requiredTier === 'premium' ? 'Premium' : 'Enterprise'}
          </Button>
          <p className="text-sm text-gray-500">
            Current plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

