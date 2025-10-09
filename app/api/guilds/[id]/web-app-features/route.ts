import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    const { id: guildId } = await params;

    // Get guild subscription status
    let isPremium = false;
    try {
      const subscriptionResult = await query(
        'SELECT status FROM guilds WHERE guild_id = ?',
        [guildId]
      );
      if (subscriptionResult.length > 0) {
        isPremium = subscriptionResult[0].status === 'premium';
      }
      console.log('🚨🚨🚨 GUILD PREMIUM STATUS:', { guildId, isPremium });
    } catch (error) {
      console.log('🚨🚨🚨 ERROR CHECKING PREMIUM STATUS:', error);
    }

    // Get all available features from the features table
    console.log('🚨🚨🚨 FETCHING FEATURES FROM DATABASE! 🚨🚨🚨');
    let allFeatures;
    try {
      // Get active features + features that are enabled for this guild (even if inactive)
      // Exclude fdg_donator_sync as it's a custom feature for specific customer
      allFeatures = await query(
        `SELECT DISTINCT f.feature_key, f.feature_name, f.description, f.minimum_package 
         FROM features f
         LEFT JOIN guild_features gf ON f.feature_key = gf.feature_key AND gf.guild_id = ?
         WHERE (f.is_active = TRUE OR gf.enabled = 1) AND f.feature_key != 'fdg_donator_sync'
         ORDER BY f.minimum_package ASC, f.feature_name ASC`,
        [guildId]
      );
      
      // Fix the feature name for ai_summarization after the query
      allFeatures = allFeatures.map((feature: any) => ({
        ...feature,
        feature_name: feature.feature_key === 'ai_summarization' ? 'AI Message Summarization' : feature.feature_name
      }));
      console.log('🚨🚨🚨 FEATURES (active + guild-enabled):', allFeatures);
    } catch (error) {
      console.log('🚨🚨🚨 FEATURES TABLE ERROR, USING FALLBACK! 🚨🚨🚨');
      console.error('Features table error:', error);
      // Fallback to hardcoded features if table doesn't exist or is empty
      allFeatures = [
        { feature_key: 'moderation', feature_name: 'Moderation Tools', description: 'Access to moderation dashboard and case management', minimum_package: 'free' },
        { feature_key: 'custom_commands', feature_name: 'Custom Commands', description: 'Create and manage custom server commands', minimum_package: 'free' },
        { feature_key: 'embedded_messages', feature_name: 'Embedded Messages', description: 'Create and send rich embedded messages', minimum_package: 'free' },
        { feature_key: 'reaction_roles', feature_name: 'Reaction Roles', description: 'Set up reaction-based role assignments', minimum_package: 'free' },
        { feature_key: 'verification_system', feature_name: 'Verification System', description: 'User verification and role assignment', minimum_package: 'free' },
        { feature_key: 'feedback_system', feature_name: 'Feedback Collection', description: 'Collect and manage user feedback', minimum_package: 'free' },
        { feature_key: 'ai_summarization', feature_name: 'AI Message Summarization', description: 'Use AI to summarize Discord messages and conversations', minimum_package: 'premium' }
      ];
      console.log('🚨🚨🚨 USING FALLBACK FEATURES:', allFeatures);
    }

    // Get current feature states for this guild
    console.log('🚨🚨🚨 FETCHING GUILD FEATURES FROM DATABASE! 🚨🚨🚨');
    let guildFeatures;
    try {
      guildFeatures = await query(
        'SELECT gf.feature_key, gf.enabled, f.feature_name as display_name FROM guild_features gf LEFT JOIN features f ON gf.feature_key = f.feature_key WHERE gf.guild_id = ?',
        [guildId]
      );
      console.log('🚨🚨🚨 GUILD FEATURES FROM DB:', guildFeatures);
    } catch (error) {
      console.log('🚨🚨🚨 GUILD FEATURES TABLE ERROR, USING EMPTY! 🚨🚨🚨');
      console.error('Guild features table error:', error);
      guildFeatures = [];
    }

    // Convert guild features to object format using feature keys
    const featureStates: Record<string, boolean> = {};
    guildFeatures.forEach((feature: any) => {
      // Use feature_key as the key for the states object
      featureStates[feature.feature_key] = feature.enabled;
    });

    // Build response with all features and their states
    const webAppFeatures = {
      features: allFeatures.map((feature: any) => {
        const isPremiumFeature = feature.minimum_package === 'premium';
        const canEnable = !isPremiumFeature || isPremium;
        const currentEnabled = featureStates[feature.feature_key] || false;
        
        // For premium features: if they're enabled in guild_features, show them as enabled
        // This allows special access to premium features even for non-premium servers
        const finalEnabled = isPremiumFeature ? currentEnabled : (canEnable ? currentEnabled : false);
        
        return {
          key: feature.feature_key,
          name: feature.feature_name,
          description: feature.description,
          minimumPackage: feature.minimum_package,
          enabled: finalEnabled,
          canEnable: canEnable
        };
      }),
      states: featureStates,
      isPremium: isPremium
    };

    console.log('🚨🚨🚨 FINAL WEB APP FEATURES RESPONSE:', webAppFeatures);
    return NextResponse.json(webAppFeatures);
  } catch (error) {
    console.error('🚨🚨🚨 ERROR FETCHING WEB APP FEATURES! 🚨🚨🚨');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    const { id: guildId } = await params;
    const body = await request.json();
    const { features } = body;

    if (!features || typeof features !== 'object') {
      return NextResponse.json({ error: 'Invalid features data' }, { status: 400 });
    }

    // Update each feature
    for (const [featureKey, enabled] of Object.entries(features)) {
      await query(
        'INSERT INTO guild_features (guild_id, feature_key, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)',
        [guildId, featureKey, enabled]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating web app features:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
