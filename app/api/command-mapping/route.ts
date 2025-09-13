import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function GET() {
  try {
    const connection = await getDbConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT command_name, feature_name, description FROM command_mappings ORDER BY feature_name, command_name'
      );
      
      return NextResponse.json({
        success: true,
        commands: rows
      });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error fetching command mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch command mappings' },
      { status: 500 }
    );
  }
}
