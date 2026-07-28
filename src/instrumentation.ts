import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Ohne DSN (z. B. lokal) wird Sentry.init nie aufgerufen — alle Sentry.*-
  // Aufrufe an anderer Stelle laufen dann folgenlos ins Leere.
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
