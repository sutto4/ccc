import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { command_name, feature_key, description } = await request.json();
    
    await query(
      'UPDATE command_mappings SET command_name = ?, feature_key = ?, description = ? WHERE id = ?',
      [command_name, feature_key, description || '', id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Command mapping updated successfully'
    });
  } catch (error) {
    console.error('Error updating command mapping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update command mapping' },
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
    
    await query('DELETE FROM command_mappings WHERE id = ?', [id]);
    
    return NextResponse.json({
      success: true,
      message: 'Command mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting command mapping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete command mapping' },
      { status: 500 }
    );
  }
}
