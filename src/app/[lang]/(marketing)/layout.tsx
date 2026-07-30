import { notFound } from "next/navigation";

import { LanguageSwitcher } from "@/components/app-shell/language-switcher";
import { isLocale } from "@/i18n/config";

export default async function MarketingLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <div className="relative">
      <div className="absolute right-6 top-6 z-10">
        <LanguageSwitcher current={lang} />
      </div>
      {children}
    </div>
  );
}
