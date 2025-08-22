import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { query } from "@/lib/db";

// GET all features
export const GET = withAuth(async (_req, _params, auth) => {
  console.log('[ADMIN-FEATURES] Auth context:', { 
    hasAccessToken: !!auth?.accessToken, 
    hasDiscordId: !!auth?.discordId, 
    role: auth?.role 
  });
  
  // Check if user is admin
  if (auth?.role !== 'admin' && auth?.role !== 'owner') {
    console.log('[ADMIN-FEATURES] Access denied for role:', auth?.role);
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  console.log('[ADMIN-FEATURES] Admin access granted for role:', auth?.role);

  try {
    const result = await query(
      `SELECT id, feature_key, feature_name, description, minimum_package, is_active, created_at, updated_at 
       FROM features 
       ORDER BY feature_name ASC`
    );

    let rows = result;
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      rows = result[0]; // MySQL2 returns [rows, fields] format
    }

    return NextResponse.json({ features: rows });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json({ 
      error: "Failed to fetch features",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

// POST new feature
export const POST = withAuth(async (req, _params, auth) => {
  // Check if user is admin
  if (auth?.role !== 'admin' && auth?.role !== 'owner') {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { feature_key, feature_name, description, minimum_package, is_active } = body;

    // Validate required fields
    if (!feature_key || !feature_name || !description || !minimum_package) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate package type
    if (!['free', 'premium'].includes(minimum_package)) {
      return NextResponse.json({ error: "Invalid package type" }, { status: 400 });
    }

    // Check if feature key already exists
    const existingResult = await query(
      `SELECT id FROM features WHERE feature_key = ?`,
      [feature_key]
    );

    let existing = existingResult;
    if (Array.isArray(existingResult) && existingResult.length > 0 && Array.isArray(existingResult[0])) {
      existing = existingResult[0];
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Feature key already exists" }, { status: 409 });
    }

    // Insert new feature
    const insertResult = await query(
      `INSERT INTO features (feature_key, feature_name, description, minimum_package, is_active) 
       VALUES (?, ?, ?, ?, ?)`,
      [feature_key, feature_name, description, minimum_package, is_active ? 1 : 0]
    );

    return NextResponse.json({ 
      success: true, 
      message: "Feature created successfully",
      featureId: insertResult.insertId
    });

  } catch (error) {
    console.error('Error creating feature:', error);
    return NextResponse.json({ 
      error: "Failed to create feature",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
