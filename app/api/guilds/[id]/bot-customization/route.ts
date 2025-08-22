import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { query } from "@/lib/db";

// Function to trigger immediate bot update
async function triggerBotUpdate(guildId: string) {
  try {
    // Call the bot's immediate update endpoint
    const botUrl = process.env.BOT_WEBHOOK_URL || 'http://localhost:3001';
    const response = await fetch(`${botUrl}/api/bot-customization/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BOT_API_SECRET || 'default-secret'}`
      },
      body: JSON.stringify({ guildId })
    });
    
    if (response.ok) {
      console.log(`[BOT-CUSTOMIZATION] Bot update triggered successfully for guild ${guildId}`);
    } else {
      console.warn(`[BOT-CUSTOMIZATION] Bot update trigger failed for guild ${guildId}:`, response.status);
    }
  } catch (error) {
    console.error(`[BOT-CUSTOMIZATION] Error triggering bot update for guild ${guildId}:`, error);
  }
}

// GET bot customization settings
export const GET = withAuth(async (_req, { params }, _auth) => {
  const guildId = (await params).id;
  console.log('[BOT-CUSTOMIZATION] GET request received for guild:', guildId);
  
  try {
    console.log('[BOT-CUSTOMIZATION] Attempting database query...');
    
    const result = await query(
      `SELECT bot_name, bot_avatar FROM bot_customization WHERE guild_id = ?`,
      [guildId]
    );
    
    console.log('[BOT-CUSTOMIZATION] Query result:', result);
    
    // Handle different possible return formats from the database
    let rows = result;
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      rows = result[0]; // MySQL2 returns [rows, fields] format
    } else if (!Array.isArray(result)) {
      rows = []; // Handle case where result is not an array
    }
    
    console.log('[BOT-CUSTOMIZATION] Processed rows:', rows);
    
    if (!rows || rows.length === 0) {
      console.log('[BOT-CUSTOMIZATION] No settings found, returning defaults');
      // Return default settings if none exist
      return NextResponse.json({
        bot_name: "Discord Bot",
        bot_avatar: ""
      });
    }
    
    console.log('[BOT-CUSTOMIZATION] Returning existing settings');
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('[BOT-CUSTOMIZATION] Error details:', error);
    console.error('[BOT-CUSTOMIZATION] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: "Failed to fetch bot customization",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

// PUT update bot customization settings
export const PUT = withAuth(async (req, { params }, _auth) => {
  const guildId = (await params).id;
  console.log('[BOT-CUSTOMIZATION] PUT request received for guild:', guildId);
  
  try {
    const body = await req.json();
    console.log('[BOT-CUSTOMIZATION] Request body:', body);
    
    const { bot_name, bot_avatar } = body;
    
    // Validate required fields
    if (!bot_name || bot_name.trim().length === 0) {
      return NextResponse.json({ error: "Bot name is required" }, { status: 400 });
    }
    
    if (bot_name.length > 32) {
      return NextResponse.json({ error: "Bot name must be 32 characters or less" }, { status: 400 });
    }
    
    if (bot_avatar && !bot_avatar.startsWith('http')) {
      return NextResponse.json({ error: "Bot avatar must be a valid URL" }, { status: 400 });
    }
    
    console.log('[BOT-CUSTOMIZATION] Checking if settings exist...');
    
    // Check if settings exist for this guild
    const existingResult = await query(
      `SELECT guild_id FROM bot_customization WHERE guild_id = ?`,
      [guildId]
    );
    
    // Handle different possible return formats
    let existing = existingResult;
    if (Array.isArray(existingResult) && existingResult.length > 0 && Array.isArray(existingResult[0])) {
      existing = existingResult[0]; // MySQL2 returns [rows, fields] format
    }
    
    if (existing && existing.length > 0) {
      console.log('[BOT-CUSTOMIZATION] Updating existing settings...');
      // Update existing settings
      await query(
        `UPDATE bot_customization SET
          bot_name = ?,
          bot_avatar = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE guild_id = ?`,
        [bot_name.trim(), bot_avatar || null, guildId]
      );
    } else {
      console.log('[BOT-CUSTOMIZATION] Inserting new settings...');
      // Insert new settings
      await query(
        `INSERT INTO bot_customization (guild_id, bot_name, bot_avatar) VALUES (?, ?, ?)`,
        [guildId, bot_name.trim(), bot_avatar || null]
      );
    }
    
    // Trigger immediate bot update
    console.log(`[BOT-CUSTOMIZATION] Settings updated for guild ${guildId}, triggering immediate bot update...`);
    await triggerBotUpdate(guildId);
    
    return NextResponse.json({ 
      success: true, 
      message: "Bot customization updated successfully and bot update triggered!" 
    });
    
  } catch (error) {
    console.error('[BOT-CUSTOMIZATION] Error updating bot customization:', error);
    console.error('[BOT-CUSTOMIZATION] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: "Failed to update bot customization",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
