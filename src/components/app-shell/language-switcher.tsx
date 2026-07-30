"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocale } from "@/app/[lang]/language-actions";
import {
  localeNames,
  locales,
  withLocale,
  type Locale,
} from "@/i18n/config";

/**
 * Two languages, so a pair of buttons beats a dropdown: one click instead of
 * two, and the alternative is visible without opening anything.
 */
export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      // Same page, other language — nobody wants to be thrown back to the
      // dashboard for switching.
      router.push(withLocale(pathname, locale));
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs" role="group">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          disabled={pending}
          aria-current={locale === current ? "true" : undefined}
          onClick={() => choose(locale)}
          className={`rounded px-1.5 py-0.5 uppercase transition-colors disabled:opacity-60 ${
            locale === current
              ? "bg-surface-overlay text-content-strong"
              : "text-content-faint hover:text-content-base"
          }`}
          title={localeNames[locale]}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
