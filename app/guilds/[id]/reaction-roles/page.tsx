import ReactionRolesSetup from "@/components/reaction-roles-setup";
import { getGuildPremiumStatus } from "@/lib/premium";

export default async function ReactionRolesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const premium = await getGuildPremiumStatus(id);
  return <ReactionRolesSetup premium={premium} />;
}
