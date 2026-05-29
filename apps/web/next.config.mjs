import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  // SW is generated for production builds only; dev stays unencumbered.
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheOnFrontEndNav: true,
  workboxOptions: {
    // Never cache API calls — offline writes go through the IndexedDB queue.
    runtimeCaching: [
      {
        urlPattern: /^https?.*\/api\/.*/i,
        handler: 'NetworkOnly',
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
};

export default withPWA(nextConfig);
