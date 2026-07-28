import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  // Skip uploading source maps without an auth token (e.g. local dev) —
  // the build itself is unaffected either way.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
