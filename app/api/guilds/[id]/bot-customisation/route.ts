import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// In-memory storage for bot customisation (in production, this would be in a database)
const botCustomisationStore = new Map<string, { botName: string; botAvatarUrl: string }>();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id: guildId } = params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get bot customisation settings for this guild
  const settings = botCustomisationStore.get(guildId) || { botName: "", botAvatarUrl: "" };
  
  return NextResponse.json(settings);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id: guildId } = params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { botName, botAvatarUrl } = await req.json();

    // Validate inputs
    if (botName && typeof botName === 'string' && botName.length > 32) {
      return NextResponse.json({ error: "Bot name must be 32 characters or less" }, { status: 400 });
    }

    if (botAvatarUrl && typeof botAvatarUrl === 'string') {
      try {
        new URL(botAvatarUrl);
      } catch {
        return NextResponse.json({ error: "Invalid avatar URL format" }, { status: 400 });
      }
    }

    // Store the settings locally
    botCustomisationStore.set(guildId, {
      botName: botName || "",
      botAvatarUrl: botAvatarUrl || ""
    });

    // Sync with Discord bot
    try {
      const botApiUrl = process.env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
      if (botApiUrl) {
        await fetch(`${botApiUrl}/guilds/${guildId}/reaction-roles/sync-bot-customisation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botName: botName || null,
            botAvatarUrl: botAvatarUrl || null
          })
        });
      }
    } catch (syncError) {
      console.error("Failed to sync with Discord bot:", syncError);
      // Don't fail the request if bot sync fails
    }

    return NextResponse.json({ 
      success: true, 
      botName: botName || "", 
      botAvatarUrl: botAvatarUrl || "" 
    });
  } catch (error) {
    console.error("Error saving bot customisation:", error);
    return NextResponse.json({ error: "Failed to save bot settings" }, { status: 500 });
  }
}
