import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import net from 'net';

// Check if Local Supabase is running
const checkLocalSupabase = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(500); // Fast timeout
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(54321, '127.0.0.1', () => {
      socket.end();
      resolve(true);
    });
  });
};

const nextConfig = async (): Promise<NextConfig> => {
  // Only run this check in development
  if (process.env.NODE_ENV === 'development') {
    const isLocalSupabaseRunning = await checkLocalSupabase();

    if (!isLocalSupabaseRunning && process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL) {
      console.warn('\n⚠️  Local Supabase not detected on port 54321.');
      console.warn('🔄 Switching to REMOTE Supabase configuration...\n');

      // Unset local variables so config.ts falls back to remote
      delete process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY;
      delete process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;

      // Also switch API URL if it was set to local
      if (process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL) {
        delete process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL;
      }
    } else if (isLocalSupabaseRunning) {
      // Local Supabase detected
    }
  }

  return {
    /* config options here */
    // allowedDevOrigins: ['piotrs-macbook-air.local'],
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'zmlluqqqwrfhygvpfqka.supabase.co',
        },
        {
          protocol: 'http',
          hostname: '127.0.0.1',
        },
        {
          protocol: 'https',
          hostname: 'i.scdn.co',
        },
        {
          protocol: 'https',
          hostname: 'picsum.photos',
        },
        {
          protocol: 'https',
          hostname: 'images.unsplash.com',
        },
      ],
    },
    serverExternalPackages: ['nodemailer'],
    rewrites: async () => ({
      beforeFiles: [
        {
          source: '/ingest/static/:path*',
          destination: 'https://us-assets.i.posthog.com/static/:path*',
        },
        {
          source: '/ingest/:path*',
          destination: 'https://us.i.posthog.com/:path*',
        },
      ],
    }),
  };
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'bmr-p0',

  project: 'guitar-crm',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
