/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  async rewrites() {
    const base = process.env.SERVER_API_BASE_URL;
    console.log('🔍 SERVER_API_BASE_URL:', base);
    
    if (!base) {
      console.log('❌ No SERVER_API_BASE_URL found, returning empty rewrites');
      return [];
    }
    
    // More explicit rewrite configuration
    return [
      {
        source: '/proxy/:path*',
        destination: `${base}/:path*`,
        has: [
          {
            type: 'header',
            key: 'accept',
          },
        ],
      },
    ];
  },
}

export default nextConfig