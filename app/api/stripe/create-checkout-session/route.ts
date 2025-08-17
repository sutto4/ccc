import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, guildId } = await request.json();

    // Define your product plans
    const plans = {
      solo: {
        price: 995, // $9.95 in cents
        name: 'Early Adopter Solo',
        maxServers: 1
      },
      squad: {
        price: 1995, // $19.95 in cents
        name: 'Early Adopter Squad', 
        maxServers: 3
      },
      city: {
        price: 2995, // $29.95 in cents
        name: 'Early Adopter City',
        maxServers: 10
      }
    };

    const plan = plans[planId as keyof typeof plans];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: plan.name,
              description: `Up to ${plan.maxServers} Discord servers`,
            },
            unit_amount: plan.price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/guilds/${guildId}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/guilds/${guildId}/settings?canceled=true`,
      metadata: {
        guildId,
        planId,
        userId: session.user.id,
        maxServers: plan.maxServers.toString()
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
