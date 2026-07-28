import Link from "next/link";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

import { LogoutButton } from "./logout-button";

type Props = {
  locale: Locale;
  dict: Dictionary;
  username: string;
  coins: number;
};

export function TopNav({ locale, dict, username, coins }: Props) {
  // Einträge ohne `href` sind noch nicht gebaut. Sie stehen trotzdem schon
  // hier, damit die Navigation nicht bei jeder Phase umspringt — als Text
  // statt Link, damit niemand in einen 404 läuft.
  const items: { label: string; href?: string }[] = [
    { label: dict.nav.dashboard, href: `/${locale}/dashboard` },
    { label: dict.nav.roadmap },
    { label: dict.nav.learn },
    { label: dict.nav.progress },
    { label: dict.nav.avatar },
  ];

  return (
    <header className="border-b border-surface-border bg-surface-raised">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
        <Link
          href={`/${locale}/dashboard`}
          className="flex items-center gap-2 font-semibold text-content-strong"
        >
          <span aria-hidden className="font-jp text-xl text-accent">
            日
          </span>
          {dict.meta.appName}
        </Link>

        <ul className="hidden items-center gap-5 text-sm sm:flex">
          {items.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-content-base transition-colors hover:text-content-strong"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="cursor-default text-content-faint">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-coin">
            {coins}
            <span aria-hidden>◎</span>
          </span>
          <span className="text-content-muted">{username}</span>
          <LogoutButton label={dict.nav.logout} locale={locale} />
        </div>
      </nav>
    </header>
  );
}
