import Link from "next/link";

import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function NotFound() {
  // not-found.tsx bekommt keine Route-Params — daher die Standardsprache.
  const dict = await getDictionary(defaultLocale);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span aria-hidden className="font-jp text-5xl text-accent">
        迷
      </span>
      <h1 className="text-xl font-semibold text-content-strong">
        {dict.common.notFoundTitle}
      </h1>
      <p className="text-content-muted">{dict.common.notFoundBody}</p>
      <Link
        href={`/${defaultLocale}`}
        className="mt-2 rounded-lg border border-surface-border px-4 py-2 text-sm text-content-base hover:border-content-faint"
      >
        {dict.common.backHome}
      </Link>
    </div>
  );
}
