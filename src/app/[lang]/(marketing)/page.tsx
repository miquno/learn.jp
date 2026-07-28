import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function LandingPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const features = [
    {
      title: dict.landing.featureSrsTitle,
      body: dict.landing.featureSrsBody,
      glyph: "復",
    },
    {
      title: dict.landing.featurePathTitle,
      body: dict.landing.featurePathBody,
      glyph: "道",
    },
    {
      title: dict.landing.featureFunTitle,
      body: dict.landing.featureFunBody,
      glyph: "楽",
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-16 px-6 py-20">
      <section className="flex flex-col items-start gap-6">
        <span className="rounded-full border border-surface-border px-3 py-1 text-sm text-content-muted">
          {dict.meta.appName}
        </span>
        <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-content-strong sm:text-6xl">
          {dict.landing.heroTitle}
        </h1>
        <p className="max-w-xl text-lg text-content-muted">
          {dict.landing.heroBody}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/${lang}/register`}
            className="rounded-lg bg-accent px-5 py-3 font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            {dict.landing.ctaPrimary}
          </Link>
          <Link
            href={`/${lang}/login`}
            className="rounded-lg border border-surface-border px-5 py-3 font-medium text-content-base transition-colors hover:border-content-faint"
          >
            {dict.landing.ctaSecondary}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-card border border-surface-border bg-surface-raised p-6"
          >
            <span
              aria-hidden
              className="font-jp text-3xl text-accent"
            >
              {feature.glyph}
            </span>
            <h2 className="mt-3 font-medium text-content-strong">
              {feature.title}
            </h2>
            <p className="mt-2 text-sm text-content-muted">{feature.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
