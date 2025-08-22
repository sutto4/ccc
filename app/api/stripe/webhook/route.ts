import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';


const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Automatically enables all premium features for a guild based on what's in the features table
 */
async function autoEnablePremiumFeatures(connection: any, guildId: string) {
  try {
    console.log(`Starting auto-enable for guild ${guildId}...`);
    
    // Get all premium features from the features table
    const [premiumFeatures] = await connection.execute(`
      SELECT feature_key, feature_name 
      FROM features 
      WHERE minimum_package = 'premium' AND is_active = 1
    `);
    
    console.log(`Found ${premiumFeatures.length} premium features:`, premiumFeatures);
    
    if (!Array.isArray(premiumFeatures) || premiumFeatures.length === 0) {
      console.log('No premium features found to enable');
      return;
    }
    
    // Create guild_features table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS guild_features (
        id int(11) NOT NULL AUTO_INCREMENT,
        guild_id varchar(255) NOT NULL,
        feature_name varchar(255) NOT NULL,
        enabled tinyint(1) NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY guild_feature (guild_id, feature_name),
        KEY guild_id (guild_id),
        KEY feature_name (feature_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Enable each premium feature
    for (const feature of premiumFeatures) {
      const featureName = feature.feature_key || feature.feature_name;
      console.log(`Enabling feature: ${featureName} for guild ${guildId}`);
      
      await connection.execute(`
        INSERT INTO guild_features (guild_id, feature_name, enabled) 
        VALUES (?, ?, 1) 
        ON DUPLICATE KEY UPDATE enabled = 1, updated_at = CURRENT_TIMESTAMP
      `, [guildId, featureName]);
    }
    
    console.log(`Successfully auto-enabled ${premiumFeatures.length} premium features for guild ${guildId}`);
    
  } catch (error) {
    console.error('Error in autoEnablePremiumFeatures:', error);
    // Don't throw - we don't want to fail the entire webhook if feature enabling fails
  }
}

/**
 * Automatically disables all premium features for a guild when subscription is cancelled
 */
async function autoDisablePremiumFeatures(connection: any, guildId: string) {
  try {
    console.log(`Starting auto-disable for guild ${guildId}...`);
    
    // Get all premium features from the features table
    const [premiumFeatures] = await connection.execute(`
      SELECT feature_key, feature_name 
      FROM features 
      WHERE minimum_package = 'premium' AND is_active = 1
    `);
    
    console.log(`Found ${premiumFeatures.length} premium features to disable:`, premiumFeatures);
    
    if (!Array.isArray(premiumFeatures) || premiumFeatures.length === 0) {
      console.log('No premium features found to disable');
      return;
    }
    
    // Disable each premium feature
    for (const feature of premiumFeatures) {
      const featureName = feature.feature_key || feature.feature_name;
      console.log(`Disabling feature: ${featureName} for guild ${guildId}`);
      
      await connection.execute(`
        INSERT INTO guild_features (guild_id, feature_name, enabled) 
        VALUES (?, ?, 0) 
        ON DUPLICATE KEY UPDATE enabled = 0, updated_at = CURRENT_TIMESTAMP
      `, [guildId, featureName]);
    }
    
    console.log(`Successfully auto-disabled ${premiumFeatures.length} premium features for guild ${guildId}`);
    
  } catch (error) {
    console.error('Error in autoDisablePremiumFeatures:', error);
    // Don't throw - we don't want to fail the entire webhook if feature disabling fails
  }
}

export async function POST(request: NextRequest) {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Request received at:', new Date().toISOString());
  
  try {
    const body = await request.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('=== CHECKOUT SESSION COMPLETED ===');
      console.log('Full session object:', JSON.stringify(session, null, 2));
      console.log('Session metadata:', session.metadata);
      console.log('Session subscription:', session.subscription);
      
      const { guildId, planId, userId, maxServers } = session.metadata || {};
      console.log('Extracted metadata:', { guildId, planId, userId, maxServers });

      // Store guildId in subscription metadata for future webhook events
      if (session.subscription) {
        console.log('Updating subscription metadata with guildId:', guildId);
        await stripe.subscriptions.update(session.subscription as string, {
          metadata: { guildId }
        });
        console.log('Subscription metadata updated successfully');
        
        // Small delay to ensure metadata is saved
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('Processing checkout.session.completed:', { guildId, planId, userId, maxServers });

      // Get customer details from Stripe
      const customer = await stripe.customers.retrieve(session.customer as string);
      const subscription = await stripe.subscriptions.list({
        customer: session.customer as string,
        limit: 1,
      });

      const sub = subscription.data[0];

      // Dynamically import MySQL driver
      console.log('Attempting to import mysql2/promise...');
      const { default: mysqlDriver } = await import('mysql2/promise');
      console.log('MySQL driver imported successfully:', typeof mysqlDriver);
      
      // Connect to MySQL database using the same env vars as your bot
      console.log('Database config:', {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'admin_user',
        database: process.env.DB_NAME || 'chester_bot',
        port: 3306
      });
      
      const connection = await mysqlDriver.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'admin_user',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'chester_bot',
        port: 3306
      });
      console.log('Database connection successful');
      
              try {
          console.log('About to execute database update...');
          console.log('Update parameters:', {
            customerId: customer.id,
            customerEmail: customer.email,
            customerName: customer.name,
            subscriptionId: sub.id,
            subscriptionStatus: sub.status,
            periodStart: new Date(sub.current_period_start * 1000),
            periodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            guildId: guildId
          });
          
          // Update guild premium status in database
          const result = await connection.execute(`
            UPDATE guilds 
            SET 
              premium = '1',
              stripe_customer_id = ?,
              customer_email = ?,
              customer_name = ?,
              subscription_id = ?,
              subscription_status = ?,
              current_period_start = ?,
              current_period_end = ?,
              cancel_at_period_end = ?
            WHERE guild_id = ?
          `, [customer.id, customer.email, customer.name, sub.id, sub.status, 
               new Date(sub.current_period_start * 1000), 
               new Date(sub.current_period_end * 1000), 
               sub.cancel_at_period_end, guildId]);
        
        console.log('Database update result:', result);
        console.log(`Guild ${guildId} upgraded to premium plan: ${planId}`);
        
        // Auto-enable all premium features for this guild
        console.log('Auto-enabling premium features...');
        await autoEnablePremiumFeatures(connection, guildId);
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      } finally {
        await connection.end();
      }
    }

        if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      console.log('Subscription updated event:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        metadata: subscription.metadata,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      });
      
      const guildId = subscription.metadata?.guildId;
      console.log('Extracted guildId:', guildId);

      if (guildId) {
        // Dynamically import MySQL driver
        const { default: mysqlDriver2 } = await import('mysql2/promise');
        
        // Connect to MySQL database using the same env vars as your bot
        const connection = await mysqlDriver2.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'admin_user',
          password: process.env.DB_PASS || '',
          database: process.env.DB_NAME || 'chester_bot',
          port: 3306
        });
        
        try {
          // Update subscription status and handle end-of-period cancellations
          if (subscription.cancel_at_period_end) {
            console.log(`Subscription ${subscription.id} will end at period end`);
            await connection.execute(`
              UPDATE guilds 
              SET 
                subscription_status = 'cancel_at_period_end',
                cancel_at_period_end = '1'
              WHERE guild_id = ?
            `, [guildId]);
                     } else {
             // Subscription was reactivated
             console.log(`Subscription ${subscription.id} was reactivated`);
             await connection.execute(`
               UPDATE guilds 
               SET 
                 subscription_status = ?,
                 cancel_at_period_end = '0',
                 premium = '1'
               WHERE guild_id = ?
             `, [subscription.status, guildId]);
             
             // Auto-enable premium features when reactivated
             console.log('Re-enabling premium features after reactivation...');
             await autoEnablePremiumFeatures(connection, guildId);
           }
        } finally {
          await connection.end();
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      console.log('Subscription deleted event:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        metadata: subscription.metadata,
        allFields: Object.keys(subscription)
      });
      
      const guildId = subscription.metadata?.guildId;
      console.log('Extracted guildId:', guildId);

      if (guildId) {
        // Dynamically import MySQL driver
        const { default: mysqlDriver3 } = await import('mysql2/promise');
        
        // Connect to MySQL database using the same env vars as your bot
        const connection = await mysqlDriver3.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'admin_user',
          password: process.env.DB_PASS || '',
          database: process.env.DB_NAME || 'chester_bot',
          port: 3306
        });
        
        try {
          // Remove premium status when subscription is cancelled
          await connection.execute(`
            UPDATE guilds 
            SET 
              premium = '0',
              subscription_status = 'canceled'
            WHERE guild_id = ?
          `, [guildId]);
          
          // Disable all premium features when subscription ends
          console.log('Disabling premium features after cancellation...');
          await autoDisablePremiumFeatures(connection, guildId);
          
        } finally {
          await connection.end();
        }
      }

      console.log(`Guild ${guildId} premium status removed`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('=== WEBHOOK ERROR DETAILS ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('=== END WEBHOOK ERROR ===');
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
