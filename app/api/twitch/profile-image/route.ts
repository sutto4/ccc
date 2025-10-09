import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }
  
  try {
    // Call bot API which has Twitch credentials
    const botApiUrl = process.env.BOT_API_URL || 'http://localhost:3001';
    const response = await fetch(`${botApiUrl}/api/twitch/profile-image?username=${encodeURIComponent(username)}`);
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ profileImageUrl: null });
  } catch (error) {
    console.error('[TWITCH-PROFILE] Error fetching profile image:', error);
    return NextResponse.json({ profileImageUrl: null });
  }
};


