import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PUT update feature
export const PUT = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  // Check if user is admin
  if (auth.user.role !== 'admin' && auth.user.role !== 'owner') {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id: featureKey } = await params;
    const body = await req.json();
    const { feature_name, description, minimum_package, is_active } = body;

    // Validate required fields
    if (!feature_name || !description || !minimum_package) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate package type
    if (!['free', 'premium'].includes(minimum_package)) {
      return NextResponse.json({ error: "Invalid package type" }, { status: 400 });
    }

    // Update feature
    await query(
      `UPDATE features 
       SET feature_name = ?, description = ?, minimum_package = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE feature_name = ?`,
      [feature_name, description, minimum_package, is_active ? 1 : 0, featureKey]
    );

    return NextResponse.json({ 
      success: true, 
      message: "Feature updated successfully" 
    });

  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json({ 
      error: "Failed to update feature",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

// DELETE feature
export const DELETE = async (_req: any, { params }: { params: Promise<{ id: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  // Check if user is admin
  if (auth.user.role !== 'admin' && auth.user.role !== 'owner') {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id: featureKey } = await params;

    // Check if feature is being used by any guilds
    const usageResult = await query(
      `SELECT COUNT(*) as count FROM guild_features WHERE feature_name = ?`,
      [featureKey]
    );

    let usage = usageResult;
    if (Array.isArray(usageResult) && usageResult.length > 0 && Array.isArray(usageResult[0])) {
      usage = usageResult[0];
    }

    if (usage && usage[0]?.count > 0) {
      return NextResponse.json({ 
        error: "Cannot delete feature that is in use by guilds" 
      }, { status: 400 });
    }

    // Delete feature
    await query(`DELETE FROM features WHERE feature_name = ?`, [featureKey]);

    return NextResponse.json({ 
      success: true, 
      message: "Feature deleted successfully" 
    });

  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json({ 
      error: "Failed to delete feature",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

