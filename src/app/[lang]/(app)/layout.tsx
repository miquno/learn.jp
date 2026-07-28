import { notFound } from "next/navigation";

import { TopNav } from "@/components/app-shell/top-nav";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/guards";

export default async function AppLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav
        locale={lang}
        dict={dict}
        username={user.username}
        coins={user.coins}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
