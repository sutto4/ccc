import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';


const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
                 cancel_at_period_end = '0'
               WHERE guild_id = ?
             `, [subscription.status, guildId]);
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
