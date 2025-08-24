import { NextResponse } from "next/server";
import { resetPool, getPoolStatus } from "@/lib/db";

export async function POST() {
  try {
    console.log('Resetting database pool...');
    await resetPool();
    
    const status = getPoolStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Database pool reset successfully',
      poolStatus: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to reset database pool:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
