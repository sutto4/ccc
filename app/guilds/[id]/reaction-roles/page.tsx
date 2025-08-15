import ReactionRolesSetup from "@/components/reaction-roles-setup";
import { getGuildPremiumStatus } from "@/lib/premium";
import ReactionRolesMenuBuilder from "@/components/reaction-roles-menu-builder";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default async function ReactionRolesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let premium = false;
  try {
    premium = await getGuildPremiumStatus(id);
  } catch {
    premium = false; // fail-closed if features API/DB unavailable
  }
  return (
    <div className="py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Reaction Roles</h1>
      <p className="text-sm text-muted-foreground mb-6">Configure reaction roles either via a Role Select Menu message (recommended) or classic emoji reactions.</p>
      <Tabs defaultValue="menu" className="w-full">
        <TabsList className="mb-4 rounded-full bg-muted/60 p-1 border border-border shadow-sm">
          <TabsTrigger
            value="menu"
            className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Role Menu (Recommended)
          </TabsTrigger>
          <TabsTrigger
            value="classic"
            className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Classic Emoji Reactions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="menu">
          <ReactionRolesMenuBuilder premium={premium} />
        </TabsContent>
        <TabsContent value="classic">
          <ReactionRolesSetup premium={premium} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
