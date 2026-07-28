"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span aria-hidden className="font-jp text-5xl text-negative">
        誤
      </span>
      <h1 className="text-xl font-semibold text-content-strong">
        Da ist etwas schiefgelaufen
      </h1>
      <p className="text-content-muted">
        Der Fehler wurde protokolliert. Versuch es gleich noch einmal.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-content-base hover:border-content-faint"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
