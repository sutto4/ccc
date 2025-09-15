import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guildId = params.id;

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
      allFeatures = await query(
        'SELECT feature_key as feature_key, feature_name as feature_name, description, minimum_package FROM features WHERE is_active = TRUE ORDER BY feature_name'
      );
      console.log('🚨🚨🚨 ALL FEATURES FROM DB:', allFeatures);
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
        { feature_key: 'feedback_system', feature_name: 'Feedback Collection', description: 'Collect and manage user feedback', minimum_package: 'free' }
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
      // feature_name column contains feature keys, not display names
      featureStates[feature.feature_name] = feature.enabled;
    });

    // Build response with all features and their states
    const webAppFeatures = {
      features: allFeatures.map((feature: any) => {
        const isPremiumFeature = feature.minimum_package === 'premium';
        const canEnable = !isPremiumFeature || isPremium;
        const currentEnabled = featureStates[feature.feature_key] || false;
        
        return {
          key: feature.feature_key,
          name: feature.feature_name,
          description: feature.description,
          minimumPackage: feature.minimum_package,
          enabled: canEnable ? currentEnabled : false, // Force disable premium features for non-premium servers
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guildId = params.id;
    const body = await request.json();
    const { features } = body;

    if (!features || typeof features !== 'object') {
      return NextResponse.json({ error: 'Invalid features data' }, { status: 400 });
    }

    // Update each feature
    for (const [featureKey, enabled] of Object.entries(features)) {
      await query(
        'INSERT INTO guild_features (guild_id, feature_name, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)',
        [guildId, featureKey, enabled]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating web app features:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
