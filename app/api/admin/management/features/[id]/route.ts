import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, description, minimum_package, enabled } = await request.json();
    
    await query(
      'UPDATE features SET feature_key = ?, feature_name = ?, description = ?, minimum_package = ?, is_active = ? WHERE id = ?',
      [name, name, description || '', minimum_package || 'free', enabled !== false, id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Feature updated successfully'
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feature' },
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
    
    // Check if feature is used by any guilds
    const feature = await query('SELECT feature_key FROM features WHERE id = ?', [id]);
    const featureKey = feature[0].feature_key;
    const guildUsage = await query(
      'SELECT COUNT(*) as count FROM guild_features WHERE feature_key = ?',
      [featureKey]
    );
    
    if (guildUsage[0].count > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete feature that is in use by guilds' },
        { status: 400 }
      );
    }
    
    await query('DELETE FROM features WHERE id = ?', [id]);
    
    return NextResponse.json({
      success: true,
      message: 'Feature deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete feature' },
      { status: 500 }
    );
  }
}
