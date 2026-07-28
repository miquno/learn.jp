"use client";

import { useTransition } from "react";

import { logout } from "@/app/[lang]/(app)/actions";
import type { Locale } from "@/i18n/config";

export function LogoutButton({
  label,
  locale,
}: {
  label: string;
  locale: Locale;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logout(locale))}
      className="text-content-muted transition-colors hover:text-content-base disabled:opacity-60"
    >
      {label}
    </button>
  );
}
