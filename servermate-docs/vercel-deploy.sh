#!/bin/bash

# ServerMate Docs Deployment Script
# Run this script from the servermate-docs directory

echo "🚀 Deploying ServerMate Documentation..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel:"
    echo "Run: vercel login"
    echo "Then select your preferred login method"
    exit 1
fi

# Deploy to production
echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your docs will be available at: https://your-project-name.vercel.app"
echo "📝 Don't forget to add the custom domain docs.servermate.gg in Vercel dashboard"
