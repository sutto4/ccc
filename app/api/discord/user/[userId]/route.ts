import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET Discord user info
export const GET = async (_req: any, { params }: { params: Promise<{ userId: string }> }) => {
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { userId } = await params;
  
  try {
    // Fetch user from Discord bot API
    const botBase = process.env.BOT_API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${botBase}/api/user/${userId}`);
    
    if (response.ok) {
      const userData = await response.json();
      return NextResponse.json(userData);
    } else {
      return NextResponse.json({ 
        id: userId,
        username: userId,
        name: userId
      });
    }
  } catch (error) {
    console.error('Error fetching Discord user:', error);
    // Return user ID as fallback
    return NextResponse.json({ 
      id: userId,
      username: userId,
      name: userId
    });
  }
};


