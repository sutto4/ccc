import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const features = await query(
      'SELECT id, feature_key as name, feature_name as display_name, description, minimum_package, is_active as enabled, created_at, updated_at FROM features ORDER BY display_name'
    );
    
    return NextResponse.json({
      success: true,
      features
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, display_name, description, minimum_package, enabled } = await request.json();
    
    if (!name || !display_name) {
      return NextResponse.json(
        { success: false, error: 'Name and display_name are required' },
        { status: 400 }
      );
    }
    
    await query(
      'INSERT INTO features (feature_key, feature_name, display_name, description, minimum_package, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, name, display_name, description || '', minimum_package || 'free', enabled !== false]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Feature created successfully'
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create feature' },
      { status: 500 }
    );
  }
}
