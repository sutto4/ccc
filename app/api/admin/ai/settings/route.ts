import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you might want to implement proper admin check)
    // For now, we'll assume the session user is admin
    // You should implement proper admin role checking here

    // Get AI feature settings
    const [settingsRows] = await pool.execute(
      'SELECT setting_key, setting_value FROM ai_feature_settings'
    );

    const settings: { [key: string]: string } = {};
    if (Array.isArray(settingsRows)) {
      settingsRows.forEach((row: any) => {
        settings[row.setting_key] = row.setting_value;
      });
    }

    return NextResponse.json({
      openai_api_key: settings.openai_api_key || '',
      default_model: settings.default_model || 'gpt-3.5-turbo',
      default_max_tokens: parseInt(settings.default_max_tokens || '1000'),
      default_max_messages: parseInt(settings.default_max_messages || '50'),
      default_rate_limit_hour: parseInt(settings.default_rate_limit_hour || '10'),
      default_rate_limit_day: parseInt(settings.default_rate_limit_day || '100'),
      cost_per_1k_tokens_gpt35: parseFloat(settings.cost_per_1k_tokens_gpt35 || '0.002'),
      cost_per_1k_tokens_gpt4: parseFloat(settings.cost_per_1k_tokens_gpt4 || '0.03')
    });

  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you might want to implement proper admin check)
    // For now, we'll assume the session user is admin
    // You should implement proper admin role checking here

    const body = await request.json();
    const {
      openai_api_key,
      default_model,
      default_max_tokens,
      default_max_messages,
      default_rate_limit_hour,
      default_rate_limit_day,
      cost_per_1k_tokens_gpt35,
      cost_per_1k_tokens_gpt4
    } = body;

    // Update settings
    const updates = [
      { key: 'openai_api_key', value: openai_api_key },
      { key: 'default_model', value: default_model },
      { key: 'default_max_tokens', value: default_max_tokens?.toString() },
      { key: 'default_max_messages', value: default_max_messages?.toString() },
      { key: 'default_rate_limit_hour', value: default_rate_limit_hour?.toString() },
      { key: 'default_rate_limit_day', value: default_rate_limit_day?.toString() },
      { key: 'cost_per_1k_tokens_gpt35', value: cost_per_1k_tokens_gpt35?.toString() },
      { key: 'cost_per_1k_tokens_gpt4', value: cost_per_1k_tokens_gpt4?.toString() }
    ];

    for (const update of updates) {
      if (update.value !== undefined) {
        await pool.execute(`
          INSERT INTO ai_feature_settings (setting_key, setting_value)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            updated_at = CURRENT_TIMESTAMP
        `, [update.key, update.value]);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating AI settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
