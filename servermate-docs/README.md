# ServerMate Documentation

Complete documentation site for ServerMate Discord bot using Next.js + Nextra.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Open [http://localhost:3000](http://localhost:3000)**

## 📚 Documentation Structure

- **Getting Started** - Initial setup and configuration
- **Commands** - All available bot commands with examples
- **Features** - Web dashboard features and settings
- **Configuration** - Advanced configuration options
- **FAQ** - Frequently asked questions

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel:**
   ```bash
   npx vercel
   ```

2. **Set custom domain:**
   - Go to Vercel dashboard
   - Settings → Domains
   - Add `docs.servermate.gg`

### Netlify

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   - Connect your repository
   - Set build command: `npm run build`
   - Set publish directory: `out`

### Manual Deployment

1. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## 🛠️ Customization

### Theme Configuration

Edit `theme.config.tsx` to customize:
- Site title and description
- Navigation links
- Footer content
- Theme colors

### Adding New Pages

1. Create `.mdx` files in the `pages/` directory
2. Update `_meta.json` to include new pages in navigation
3. Use standard Markdown syntax with JSX components

## 📖 Content Guidelines

### Writing Style
- Use clear, concise language
- Include practical examples
- Provide step-by-step instructions
- Add screenshots where helpful

### Command Documentation
- Include usage syntax
- List required parameters
- Show practical examples
- Note permission requirements

### Feature Documentation
- Explain what the feature does
- How to enable/configure it
- Best practices and tips
- Troubleshooting common issues

## 🔍 SEO & Performance

- Automatic sitemap generation
- Meta tags for social sharing
- Fast loading with static generation
- SEO-optimized content structure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📞 Support

- **Documentation Issues:** Create a GitHub issue
- **Content Questions:** Join our [Discord](https://discord.gg/servermate)
- **Technical Support:** Email support@servermate.gg

## 📄 License

This documentation is part of the ServerMate project.

---

**Built with ❤️ using [Next.js](https://nextjs.org) and [Nextra](https://nextra.site)**
