import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Without a DSN (e.g. locally) Sentry.init is never called — every Sentry.*
  // call elsewhere then does nothing.
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
