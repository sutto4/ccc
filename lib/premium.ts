import { fetchFeatures } from "@/lib/api";

export async function getGuildPremiumStatus(guildId: string): Promise<boolean> {
  try {
    const res = await fetchFeatures(guildId);
    // Return true if any feature is enabled
    return Object.values(res.features).some(Boolean);
  } catch (e) {
    return false;
  }
}
