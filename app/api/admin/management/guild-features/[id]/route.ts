import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { guild_id, feature_key, enabled } = await request.json();
    
    await query(
      'UPDATE guild_features SET guild_id = ?, feature_key = ?, enabled = ? WHERE id = ?',
      [guild_id, feature_key, enabled !== false, id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Guild feature updated successfully'
    });
  } catch (error) {
    console.error('Error updating guild feature:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update guild feature' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await query('DELETE FROM guild_features WHERE id = ?', [id]);
    
    return NextResponse.json({
      success: true,
      message: 'Guild feature deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting guild feature:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete guild feature' },
      { status: 500 }
    );
  }
}
