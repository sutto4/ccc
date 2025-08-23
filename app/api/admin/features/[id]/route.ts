import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { query } from "@/lib/db";

// PUT update feature
export const PUT = withAuth(async (req, { params }, auth) => {
  // Check if user is admin
  if (auth?.role !== 'admin' && auth?.role !== 'owner') {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await params;
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
       WHERE id = ?`,
      [feature_name, description, minimum_package, is_active ? 1 : 0, id]
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
export const DELETE = withAuth(async (_req, { params }, auth) => {
  // Check if user is admin
  if (auth?.role !== 'admin' && auth?.role !== 'owner') {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Check if feature is being used by any guilds
    const usageResult = await query(
      `SELECT COUNT(*) as count FROM guild_features WHERE feature_name = (SELECT feature_key FROM features WHERE id = ?)`,
      [id]
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
    await query(`DELETE FROM features WHERE id = ?`, [id]);

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

