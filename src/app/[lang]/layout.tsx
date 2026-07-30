import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#1a1c22",
  width: "device-width",
  initialScale: 1,
  // The practice games rely on fast typing — accidental double-tap zoom is
  // more annoying than a zoom lock would be helpful.
  maximumScale: 5,
};

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = await getDictionary(lang);
  return {
    title: {
      default: `${dict.meta.appName} — ${dict.meta.tagline}`,
      template: `%s · ${dict.meta.appName}`,
    },
    description: dict.landing.heroBody,
    manifest: "/manifest.webmanifest",
  };
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
