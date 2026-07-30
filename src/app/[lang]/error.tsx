"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Error boundaries are client components and receive no route params, so they
// cannot reach the dictionary. English is the fallback here.
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
        Something went wrong
      </h1>
      <p className="text-content-muted">
        The error has been logged. Give it another try.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-content-base hover:border-content-faint"
      >
        Try again
      </button>
    </div>
  );
}
