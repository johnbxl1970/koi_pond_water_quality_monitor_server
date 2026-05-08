import { execSync } from 'node:child_process';

// Resolve the admin app's own commit at build/dev-start time so the sidebar
// footer can show it without shelling out per request. Production deploys
// can pin it with NEXT_PUBLIC_GIT_COMMIT directly; the shell-out is a dev
// fallback.
function resolveAdminCommit() {
  if (process.env.NEXT_PUBLIC_GIT_COMMIT) return process.env.NEXT_PUBLIC_GIT_COMMIT;
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 2000 }).trim();
  } catch {
    return 'unknown';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained .next/standalone tree so the Docker image only
  // needs Node + a tiny subset of node_modules — slashes image size by ~80%
  // versus copying the full node_modules.
  output: 'standalone',
  env: {
    NEXT_PUBLIC_GIT_COMMIT: resolveAdminCommit(),
  },
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
