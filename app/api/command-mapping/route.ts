import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query(
      'SELECT command_name, feature_name, description FROM command_mappings ORDER BY feature_name, command_name'
    );
    
    console.log('🔍 Command mappings API - Found commands:', rows.length);
    console.log('🔍 Sticky commands:', rows.filter((row: any) => row.command_name.includes('sticky')));
    
    return NextResponse.json({
      success: true,
      commands: rows
    });
  } catch (error) {
    console.error('Error fetching command mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch command mappings' },
      { status: 500 }
    );
  }
}
