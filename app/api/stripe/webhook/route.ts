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

/**
 * Completely removes premium access from a guild, clearing all premium-related data
 */
async function removePremiumAccess(connection: any, guildId: string) {
  try {
    console.log(`Starting complete premium removal for guild ${guildId}...`);
    
    // Begin transaction to ensure all operations succeed or fail together
    await connection.beginTransaction();
    
    try {
      // 1. Update guilds table - remove all premium-related fields
      console.log(`Updating guilds table for ${guildId}...`);
      await connection.execute(`
        UPDATE guilds 
        SET 
          premium = '0',
          stripe_customer_id = NULL,
          customer_email = NULL,
          customer_name = NULL,
          subscription_id = NULL,
          subscription_status = NULL,
          current_period_start = NULL,
          current_period_end = NULL,
          cancel_at_period_end = '0',
          premium_expires_at = NULL
        WHERE guild_id = ?
      `, [guildId]);
      
      // 2. Disable all premium features in guild_features table
      console.log(`Disabling premium features for ${guildId}...`);
      await autoDisablePremiumFeatures(connection, guildId);
      
      // 3. Remove any active subscription allocations
      console.log(`Removing subscription allocations for ${guildId}...`);
      await connection.execute(`
        UPDATE subscription_allocations 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = ? AND is_active = TRUE
      `, [guildId]);
      
      // 4. Clear any cached premium data (if you have caching)
      // This would depend on your caching implementation
      
      await connection.commit();
      console.log(`Successfully removed all premium access from guild ${guildId}`);
      
    } catch (error) {
      await connection.rollback();
      console.error(`Error during premium removal for guild ${guildId}:`, error);
      throw error;
    }
    
  } catch (error) {
    console.error(`Failed to remove premium access from guild ${guildId}:`, error);
    // Don't throw - we don't want to fail the entire webhook if feature removal fails
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
      console.log('Processing checkout.session.completed:', {
        guildId: session.metadata?.guildId,
        planId: session.metadata?.planId,
        userId: session.metadata?.userId,
        maxServers: session.metadata?.maxServers
      });

      // Extract metadata - handle both old single guild and new multiple guilds format
      const guildIds = session.metadata?.guildIds;
      const planId = session.metadata?.planId;
      const userId = session.metadata?.userId;
      const maxServers = session.metadata?.maxServers;

      if (!guildIds || !planId || !userId) {
        console.log('Missing required metadata for checkout.session.completed');
        return NextResponse.json({ received: true });
      }

      // Parse guild IDs (they're stored as comma-separated string)
      const guildIdArray = guildIds.split(',').map(id => id.trim());
      console.log('Processing guild IDs:', guildIdArray);

      // Get customer and subscription details
      const customerResponse = await stripe.customers.retrieve(session.customer as string);
      const customer = customerResponse;
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
        // Process each guild
        for (const guildId of guildIdArray) {
          console.log(`Processing guild ${guildId}...`);
          
          const customerEmail = typeof customer === 'object' ? customer.email : null;
          const customerName = typeof customer === 'object' ? customer.name : null;
          
          console.log('Update parameters:', {
            customerId: customer.id,
            customerEmail: customerEmail,
            customerName: customerName,
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
          `, [customer.id, customerEmail, customerName, sub.id, sub.status, 
               new Date(sub.current_period_start * 1000), 
               new Date(sub.current_period_end * 1000), 
               sub.cancel_at_period_end, guildId]);
        
          console.log('Database update result:', result);
          console.log(`Guild ${guildId} upgraded to premium plan: ${planId}`);
          
          // Auto-enable all premium features for this guild
          console.log('Auto-enabling premium features...');
          await autoEnablePremiumFeatures(connection, guildId);
        }
        
        // Create subscription allocation records
        console.log('Creating subscription allocation records...');
        for (const guildId of guildIdArray) {
          await connection.execute(`
            INSERT INTO subscription_allocations (user_id, subscription_id, guild_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE guild_id = VALUES(guild_id)
          `, [userId, sub.id, guildId]);
        }
        
        // Update subscription usage count
        await connection.execute(`
          UPDATE subscription_limits 
          SET used_servers = ? 
          WHERE subscription_id = ?
        `, [guildIdArray.length, planId]);
        
        // Copy metadata from checkout session to subscription for future webhook events
        console.log('Copying metadata to subscription record...');
        await stripe.subscriptions.update(sub.id, {
          metadata: {
            guildIds: guildIds,
            planId: planId,
            userId: userId,
            maxServers: maxServers
          }
        });
        console.log('Subscription metadata updated successfully');
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      } finally {
        await connection.end();
      }
    }

    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object;
      console.log('Subscription created event:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        metadata: subscription.metadata,
        status: subscription.status
      });
      
      const guildIds = subscription.metadata?.guildIds;
      const planId = subscription.metadata?.planId;
      const userId = subscription.metadata?.userId;
      
      console.log('Extracted metadata:', { guildIds, planId, userId });

      if (guildIds && planId && userId) {
        // Parse guild IDs (they're stored as comma-separated string)
        const guildIdArray = guildIds.split(',').map(id => id.trim());
        
        console.log('Parsed guild IDs:', guildIdArray);
        
        // Dynamically import MySQL driver
        const { default: mysqlDriver } = await import('mysql2/promise');
        
        // Connect to MySQL database using the same env vars as your bot
        const connection = await mysqlDriver.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'admin_user',
          password: process.env.DB_PASS || '',
          database: process.env.DB_NAME || 'chester_bot',
          port: 3306
        });
        
        try {
          // Get customer details from Stripe
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const customerEmail = typeof customer === 'object' ? customer.email : null;
          const customerName = typeof customer === 'object' ? customer.name : null;
          
          console.log('Customer details:', { email: customerEmail, name: customerName });
          
          // Begin transaction for multiple guild updates
          await connection.beginTransaction();
          
          try {
            // Update each guild with premium status
            for (const guildId of guildIdArray) {
              console.log(`Updating guild ${guildId} with premium status...`);
              
              const result = await connection.execute(`
                UPDATE guilds 
                SET 
                  premium = '1',
                  customer_id = ?,
                  customer_email = ?,
                  customer_name = ?,
                  subscription_id = ?,
                  subscription_status = ?,
                  current_period_start = ?,
                  current_period_end = ?,
                  cancel_at_period_end = ?
                WHERE guild_id = ?
              `, [customer.id, customerEmail, customerName, subscription.id, subscription.status, 
                   new Date(subscription.current_period_start * 1000), 
                   new Date(subscription.current_period_end * 1000), 
                   subscription.cancel_at_period_end, guildId]);
              
              console.log(`Guild ${guildId} update result:`, result);
              
              // Auto-enable all premium features for this guild
              console.log(`Auto-enabling premium features for guild ${guildId}...`);
              await autoEnablePremiumFeatures(connection, guildId);
            }
            
            // Create subscription allocation records
            for (const guildId of guildIdArray) {
              await connection.execute(`
                INSERT INTO subscription_allocations (user_id, subscription_id, guild_id) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                  is_active = TRUE, 
                  updated_at = CURRENT_TIMESTAMP
              `, [userId, subscription.id, guildId]);
            }
            
            // Update subscription usage count
            await connection.execute(`
              UPDATE subscription_limits 
              SET used_servers = ? 
              WHERE subscription_id = ?
            `, [guildIdArray.length, planId]);
            
            await connection.commit();
            console.log(`Successfully allocated subscription ${subscription.id} to ${guildIdArray.length} guild(s)`);
            
          } catch (dbError) {
            await connection.rollback();
            console.error('Database transaction error:', dbError);
            throw dbError;
          }
          
        } catch (dbError) {
          console.error('Database error:', dbError);
          throw dbError;
        } finally {
          await connection.end();
        }
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
        metadata: subscription.metadata
      });
      
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
        // Query subscription_allocations to find ALL guilds for this subscription
        const [allocatedGuilds] = await connection.execute(`
          SELECT guild_id 
          FROM subscription_allocations 
          WHERE subscription_id = ? AND is_active = TRUE
        `, [subscription.id]);
        
        console.log(`Found ${allocatedGuilds.length} allocated guilds for subscription ${subscription.id}`);
        
        if (allocatedGuilds.length > 0) {
          // Remove premium status from ALL allocated guilds
          for (const row of allocatedGuilds) {
            const guildId = row.guild_id;
            console.log(`Removing premium status from guild ${guildId}...`);
            
            // Use the comprehensive premium removal function
            await removePremiumAccess(connection, guildId);
          }
          
          // Mark allocation records as inactive
          await connection.execute(`
            UPDATE subscription_allocations 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE subscription_id = ?
          `, [subscription.id]);
          
          // Get plan ID from metadata for subscription limits update
          const planId = subscription.metadata?.planId;
          if (planId) {
            // Update subscription usage count
            await connection.execute(`
              UPDATE subscription_limits 
              SET used_servers = GREATEST(used_servers - ?, 0)
              WHERE subscription_id = ?
            `, [allocatedGuilds.length, planId]);
          }
          
          console.log(`Successfully removed premium status from ${allocatedGuilds.length} guild(s)`);
        } else {
          console.log(`No active allocations found for subscription ${subscription.id}`);
        }
        
      } catch (dbError) {
        console.error('Database error during subscription deletion:', dbError);
        throw dbError;
      } finally {
        await connection.end();
      }
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
