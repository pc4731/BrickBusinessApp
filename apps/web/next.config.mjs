/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint is wired up in a later phase; keep production builds unblocked for now.
  eslint: { ignoreDuringBuilds: true },
  // Workspace packages ship compiled dist, so no transpilePackages needed.
};

export default nextConfig;
