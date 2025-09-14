import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const commandMappings = await query(`
      SELECT 
        cm.*,
        f.feature_name as feature_display_name
      FROM command_mappings cm
      LEFT JOIN features f ON cm.feature_key = f.feature_key
      ORDER BY cm.feature_key, cm.command_name
    `);
    
    return NextResponse.json({
      success: true,
      commandMappings
    });
  } catch (error) {
    console.error('Error fetching command mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch command mappings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { command_name, feature_key, description } = await request.json();
    
    if (!command_name || !feature_key) {
      return NextResponse.json(
        { success: false, error: 'command_name and feature_key are required' },
        { status: 400 }
      );
    }
    
    await query(
      'INSERT INTO command_mappings (command_name, feature_key, description) VALUES (?, ?, ?)',
      [command_name, feature_key, description || '']
    );
    
    return NextResponse.json({
      success: true,
      message: 'Command mapping created successfully'
    });
  } catch (error) {
    console.error('Error creating command mapping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create command mapping' },
      { status: 500 }
    );
  }
}
