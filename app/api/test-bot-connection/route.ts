import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[TEST] Testing connection to bot server...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://127.0.0.1:3001/api/commands/health');
    const healthData = await healthResponse.json();
    
    console.log('[TEST] Health check response:', healthData);
    
    return NextResponse.json({
      success: true,
      message: 'Bot server is reachable',
      health: healthData
    });
    
  } catch (error) {
    console.error('[TEST] Connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Bot server is not reachable',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
