"use client";

import ReactionRolesSetup from "@/components/reaction-roles-setup";
import ReactionRolesMenuBuilder from "@/components/reaction-roles-menu-builder";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

export default function ReactionRolesPanel({ guildId, premium = false }: { guildId: string; premium?: boolean }) {
  const [actualPremium, setActualPremium] = useState(premium);

  useEffect(() => {
    // Fetch premium status if not provided
    const fetchPremiumStatus = async () => {
      try {
        const response = await fetch(`/api/guilds/${guildId}/premium-status`);
        if (response.ok) {
          const data = await response.json();
          setActualPremium(data.premium || false);
        }
      } catch (error) {
        console.error('Failed to fetch premium status:', error);
      }
    };

    if (!premium && guildId) {
      fetchPremiumStatus();
    }
  }, [guildId, premium]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="menu" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="menu">
            Embedded Role Menu
          </TabsTrigger>
          <TabsTrigger value="classic">
            Role Reactions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="menu">
          <ReactionRolesMenuBuilder premium={actualPremium} guildIdProp={guildId} />
        </TabsContent>
        <TabsContent value="classic">
          <ReactionRolesSetup premium={actualPremium} guildIdProp={guildId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

