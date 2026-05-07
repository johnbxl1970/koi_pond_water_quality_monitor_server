/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/* to the NestJS server during dev so the admin UI hits the
  // same routes as the mobile app, with no CORS plumbing on either side.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.KOI_SERVER_URL ?? 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
