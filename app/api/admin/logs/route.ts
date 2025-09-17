import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';
import { SystemLogger, queryLogs } from '@/lib/system-logger';
import type { LogFilter } from '@/lib/system-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async (
  request: NextRequest,
  { params }: { params: {} }
) => {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    // Check if user is admin
    if (auth.user.role !== 'admin' && auth.user.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filter: LogFilter = {
      guildId: searchParams.get('guildId') || undefined,
      userId: searchParams.get('userId') || undefined,
      actionType: searchParams.get('actionType')?.split(',').filter(Boolean) as any[] || undefined,
      targetType: searchParams.get('targetType')?.split(',').filter(Boolean) as any[] || undefined,
      status: searchParams.get('status')?.split(',').filter(Boolean) as any[] || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: (parseInt(searchParams.get('page') || '1') - 1) * parseInt(searchParams.get('limit') || '50')
    };

    // Remove undefined values
    Object.keys(filter).forEach(key => {
      if ((filter as any)[key] === undefined) {
        delete (filter as any)[key];
      }
    });

    const result = await queryLogs(filter);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ADMIN-LOGS] Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: {} }
) => {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    // Check if user is admin/owner
    if (auth.user.role !== 'admin' && auth.user.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get('olderThan'); // ISO date string
    
    if (!olderThan) {
      return NextResponse.json({ error: 'olderThan parameter required' }, { status: 400 });
    }

    const cutoffDate = new Date(olderThan);
    if (isNaN(cutoffDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Delete old logs (keep last 6 months minimum)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    if (cutoffDate > sixMonthsAgo) {
      return NextResponse.json({ 
        error: 'Cannot delete logs newer than 6 months' 
      }, { status: 400 });
    }

    const { query } = await import('@/lib/db');
    const result = await query(
      'DELETE FROM system_logs WHERE created_at < ?',
      [cutoffDate]
    ) as any;

    // Log this admin action
    await SystemLogger.log({
      guildId: 'system',
      userId: auth.user.id,
      userName: auth.user.name || 'Unknown Admin',
      userEmail: auth.user.email,
      userRole: auth.user.role,
      actionType: 'system_setting',
      actionName: 'cleanup_system_logs',
      targetType: 'system',
      newValue: {
        cutoffDate: cutoffDate.toISOString(),
        deletedRows: result.affectedRows
      },
      request
    });

    return NextResponse.json({
      message: 'Logs cleaned up successfully',
      deletedRows: result.affectedRows
    });
  } catch (error) {
    console.error('[ADMIN-LOGS] Error cleaning up logs:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup logs' },
      { status: 500 }
    );
  }
};
