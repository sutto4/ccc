"use client";

import { Crown, Check, Star, Zap, Shield, Users, Bot, Command, X } from "lucide-react";
import { useState } from "react";

interface Plan {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
}

const plans: Plan[] = [
     {
     id: "solo",
     name: "Early Adopter Solo",
     price: "$9.95",
    period: "AUD/month",
    features: [
      "All Premium Features",
      "FiveM ESX & QBcore",
      "Reaction Roles",
      "Custom Commands",
      "Donator Sync",
      "Priority Support",
      "Early Access to New Features"
    ],
         popular: false,
     icon: <Users className="h-5 w-5" />
  },
     {
     id: "squad",
     name: "Early Adopter Squad",
     price: "$19.95",
    period: "AUD/month",
    features: [
      "Everything in Solo",
      "Up to 3 Discord servers",
      "Perfect for Main + PD + Business setup",
      "Discounted lifetime pricing",
      "All Premium features included"
    ],
         popular: true,
     icon: <Crown className="h-5 w-5" />
  },
     {
     id: "city",
     name: "Early Adopter City",
     price: "$29.95",
    period: "AUD/month",
    features: [
      "Everything in Squad",
      "Up to 10 Discord servers",
      "Multiple factions & gangs",
      "Business hub management",
      "Premium tools at locked price"
    ],
         popular: false,
     icon: <Command className="h-5 w-5" />
  },
        {
     id: "network",
     name: "Early Adopter Network",
     price: "",
     period: "Contact for pricing",
    features: [
      "10+ Discord servers",
      "Tailored plan",
      "Large-scale RP networks",
      "Multi-community clusters",
      "Locked-lifetime pricing"
    ],
         popular: false,
     icon: <Bot className="h-5 w-5" />
  }
];

export default function PremiumModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [selectedPlan, setSelectedPlan] = useState<string>("squad");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (planId: string) => {
    if (planId === 'network') {
      // Handle network plan differently - maybe open contact form
      window.open('mailto:contact@servermate.gg?subject=Early Adopter Network Pricing', '_blank');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get guild ID from current URL
      const pathParts = window.location.pathname.split('/');
      const guildIdIndex = pathParts.indexOf('guilds') + 1;
      const guildId = pathParts[guildIdIndex];
      
      if (!guildId) {
        console.error('Could not find guild ID in URL');
        return;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          guildId,
        }),
      });

      const { url, error } = await response.json();
      
      if (error) {
        console.error('Error:', error);
        return;
      }

      // Redirect to Stripe checkout
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

    if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
             {/* Modal */}
       <div className="relative rounded-2xl p-0 w-[50vw] h-[65vh] text-black bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/60 dark:border-gray-700/60 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:text-white overflow-hidden">
                 {/* Header */}
                  <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-4 text-white relative">
                    {/* Close Button */}
                                         <button
                       onClick={() => onOpenChange(false)}
                       className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                     >
                       <X className="h-5 w-5" />
                     </button>
                       <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-full">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Unlock Premium Features</h2>
                  <p className="text-yellow-100 text-base">
                    Early Adopter Pricing - Locked for Life
                  </p>
                  <p className="text-yellow-100 text-xs opacity-90">
                    Choose your plan based on how many Discord servers you need
                  </p>
                </div>
              </div>
            </div>
         </div>

        {/* Content */}
                                   <div className="p-6">
           {/* Feature Highlights */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <Bot className="h-6 w-6 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200">Custom Commands</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <Users className="h-6 w-6 mx-auto mb-1 text-green-600 dark:text-green-400" />
              <p className="text-xs font-medium text-green-800 dark:text-green-200">Reaction Roles</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <Command className="h-6 w-6 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
              <p className="text-xs font-medium text-purple-800 dark:text-purple-200">FiveM Integration</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <Shield className="h-6 w-6 mx-auto mb-1 text-orange-600 dark:text-orange-400" />
              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">Advanced Security</p>
            </div>
          </div>

                     {/* Subscription Plans */}
                                               <div className="grid grid-cols-4 gap-6 mb-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                                                                   className={`relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  selectedPlan === plan.id
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg scale-105"
                    : "border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-600 hover:scale-102"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                                 {plan.popular && (
                   <div className="absolute -top-2 left-4">
                     <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                       ⭐ MOST POPULAR
                     </span>
                   </div>
                 )}
                
                                 <div className="flex items-center gap-3 mb-3">
                   <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                     {plan.icon}
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                                           <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{plan.period}</span>
                      </div>
                     {plan.originalPrice && (
                       <span className="text-sm text-gray-400 line-through">{plan.originalPrice}</span>
                     )}
                   </div>
                 </div>

                                                                                                     <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                 
                 

                
              </div>
            ))}
          </div>

                     {/* Selected Plan Summary */}
           {selectedPlanData && (
             <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Selected Plan:</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedPlanData.name} - {selectedPlanData.price}/{selectedPlanData.period}
                  </p>
                </div>
                {selectedPlanData.originalPrice && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">You save:</p>
                    <p className="font-semibold text-green-600">
                      ${(parseFloat(selectedPlanData.originalPrice.replace('$', '')) - parseFloat(selectedPlanData.price.replace('$', ''))).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                `Subscribe to ${selectedPlanData?.name}`
              )}
            </button>
                         <button 
               onClick={() => onOpenChange(false)}
               className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
             >
               Maybe Later
             </button>
          </div>

                     {/* Trust Indicators */}
           <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
               <div className="flex items-center gap-2">
                 <Shield className="h-4 w-4" />
                 Secure Payment
               </div>
               <div className="flex items-center gap-2">
                 <Users className="h-4 w-4" />
                 Cancel Anytime
               </div>
             </div>
          </div>
                 </div>
       </div>
     </div>
   );
 }
