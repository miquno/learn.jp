import * as Sentry from "@sentry/nextjs";

// Client bundles only see NEXT_PUBLIC_ variables — separate from the
// server-side SENTRY_DSN in instrumentation.ts.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
