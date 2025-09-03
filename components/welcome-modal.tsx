"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Settings, Shield, Users, Bot, Sparkles, Crown } from 'lucide-react';
import Link from 'next/link';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userGuilds: any[];
  isPremium: boolean;
}

export function WelcomeModal({ isOpen, onClose, userGuilds, isPremium }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    // Check if user has seen welcome modal before
    const seen = localStorage.getItem('servermate-welcome-seen');
    if (seen) {
      setHasSeenWelcome(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !hasSeenWelcome) {
      // Mark as seen
      localStorage.setItem('servermate-welcome-seen', 'true');
      setHasSeenWelcome(true);
    }
  }, [isOpen, hasSeenWelcome]);

  const steps = [
    {
      title: "🎉 Welcome to ServerMate!",
      description: "Your Discord server management just got easier",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Thank you for choosing ServerMate! We're here to help you manage your Discord servers more efficiently.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Moderation Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Kick, ban, warn, and mute users with powerful moderation commands.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Manage roles, verify users, and control access with ease.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      title: "🚀 Quick Setup Guide",
      description: "Get your server configured in minutes",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-medium text-sm">Configure Commands</h4>
                <p className="text-xs text-muted-foreground">
                  Go to your server settings and enable the commands you need.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-medium text-sm">Set Up Permissions</h4>
                <p className="text-xs text-muted-foreground">
                  Configure who can use which commands in your server.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-medium text-sm">Customize Features</h4>
                <p className="text-xs text-muted-foreground">
                  Enable web app features and customize your experience.
                </p>
              </div>
            </div>
          </div>
          {userGuilds.length > 0 && (
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Your Servers:</p>
              <div className="space-y-2">
                {userGuilds.slice(0, 3).map((guild) => (
                  <Link 
                    key={guild.id} 
                    href={`/guilds/${guild.id}/settings`}
                    className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <img 
                      src={guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : '/default-server-icon.png'} 
                      alt={guild.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm font-medium">{guild.name}</span>
                    <Settings className="h-4 w-4 ml-auto text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: "💎 Unlock Premium Features",
      description: "Take your server management to the next level",
      content: (
        <div className="space-y-4">
          {!isPremium ? (
            <>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5" />
                  <h3 className="font-semibold">Upgrade to Premium</h3>
                </div>
                <p className="text-sm opacity-90">
                  Get access to advanced features and priority support.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Custom Commands
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Create your own custom commands with variables and logic.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Advanced Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Detailed insights into server activity and moderation actions.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Button className="w-full" asChild>
                <a href="/premium" target="_blank" rel="noopener noreferrer">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </a>
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 text-white">
                <Crown className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Premium Active!</h3>
                <p className="text-sm opacity-90">
                  You have access to all premium features. Enjoy!
                </p>
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {steps[currentStep].title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
        </DialogHeader>
        
        <div className="py-4">
          {steps[currentStep].content}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
