import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any);
    
    if (!session) {
      return NextResponse.json({ 
        error: "No session found",
        message: "You are not logged in"
      });
    }

    // Extract relevant session data
    const sessionData = {
      user: {
        id: (session as any)?.user?.id,
        name: (session as any)?.user?.name,
        email: (session as any)?.user?.email,
        discordId: (session as any)?.user?.discordId,
        image: (session as any)?.user?.image,
      },
      role: (session as any)?.role,
      accessToken: (session as any)?.accessToken ? 'Present (hidden)' : 'Missing',
      expires: (session as any)?.expires,
    };

    return NextResponse.json({
      message: "Session debug information",
      session: sessionData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in debug session endpoint:', error);
    return NextResponse.json({ 
      error: "Failed to get session info",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
