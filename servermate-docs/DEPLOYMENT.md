# Deployment Guide for docs.servermate.gg

This guide covers how to deploy the ServerMate documentation site to docs.servermate.gg.

## 🚀 Quick Deploy to Vercel

### Prerequisites
- Vercel account
- Domain access for `docs.servermate.gg`

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
vercel --prod
```

### Step 4: Configure Domain
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Domains
4. Add `docs.servermate.gg`
5. Configure DNS records as instructed

## 🔧 Alternative Deployment Methods

### Netlify
```bash
npm run build
# Upload the 'out' directory to Netlify
```

### Manual Server
```bash
npm run build
npm start
```

## 📋 Environment Variables

No environment variables are required for basic documentation deployment.

## 🔍 SEO & Analytics

The site is pre-configured with:
- Automatic sitemap generation
- Meta tags for social sharing
- Fast loading optimization
- SEO-friendly URLs

## 📊 Performance

- Static generation for fast loading
- Optimized images and assets
- CDN distribution via Vercel
- Automatic compression

## 🔄 Updates

To update the documentation:
1. Make changes to the codebase
2. Commit and push to your repository
3. Vercel will automatically redeploy

## 🐛 Troubleshooting

### Build Issues
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Domain Issues
- Ensure DNS records are properly configured
- Wait up to 24 hours for DNS propagation
- Check Vercel dashboard for domain status

### Content Issues
- Verify all links are working
- Check for broken images
- Test navigation on mobile devices

## 📞 Support

For deployment issues:
- Check Vercel documentation
- Join our [Discord support](https://discord.gg/servermate)
- Create an issue on GitHub

---

**🎉 Your documentation will be live at [docs.servermate.gg](https://docs.servermate.gg)!**
