import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function CreditsPage({
  params,
}: PageProps<"/[lang]/credits">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  // The licences of JMdict, KANJIDIC2, KanjiVG and Tatoeba explicitly require
  // attribution. This page is therefore a mandatory part of the app, not
  // decoration — it must not be optimised away.
  const sources = [
    {
      name: "JMdict",
      by: "Electronic Dictionary Research and Development Group",
      url: "https://www.edrdg.org/jmdict/j_jmdict.html",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      use: dict.credits.jmdictUse,
    },
    {
      name: "KANJIDIC2",
      by: "Electronic Dictionary Research and Development Group",
      url: "https://www.edrdg.org/wiki/index.php/KANJIDIC_Project",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      use: dict.credits.kanjidicUse,
    },
    {
      name: "KanjiVG",
      by: "Ulrich Apel",
      url: "https://kanjivg.tagaini.net",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      use: dict.credits.kanjivgUse,
    },
    {
      name: "Tatoeba",
      by: "The Tatoeba project and its contributors",
      url: "https://tatoeba.org",
      license: "CC BY 2.0 FR",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
      use: dict.credits.tatoebaUse,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-content-strong">
        {dict.credits.title}
      </h1>
      <p className="mt-3 text-content-muted">{dict.credits.intro}</p>

      <ul className="mt-10 flex flex-col gap-4">
        {sources.map((source) => (
          <li
            key={source.name}
            className="rounded-card border border-surface-border bg-surface-raised p-6"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-lg font-medium text-content-strong underline-offset-4 hover:underline"
              >
                {source.name}
              </a>
              <span className="text-sm text-content-muted">{source.by}</span>
            </div>

            <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-content-faint">{dict.credits.licenseLabel}</dt>
              <dd>
                <a
                  href={source.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-content-base underline-offset-4 hover:underline"
                >
                  {source.license}
                </a>
              </dd>
              <dt className="text-content-faint">{dict.credits.usedFor}</dt>
              <dd className="text-content-base">{source.use}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-content-faint">{dict.credits.note}</p>
    </main>
  );
}
