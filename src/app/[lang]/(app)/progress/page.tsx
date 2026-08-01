import { notFound } from "next/navigation";

import { KanaTable } from "@/components/progress/kana-table";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/guards";
import {
  getKanaTable,
  getStartedWords,
  getWeakItems,
} from "@/lib/srs/progress";

export default async function ProgressPage({
  params,
}: PageProps<"/[lang]/progress">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);

  const [hiragana, katakana, weak, words] = await Promise.all([
    getKanaTable(user.id, "hiragana"),
    getKanaTable(user.id, "katakana"),
    getWeakItems(user.id, lang),
    getStartedWords(user.id, lang),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.progress.title}
        </h1>
        <p className="mt-1 text-content-muted">{dict.progress.intro}</p>
      </div>

      <section className="rounded-card border border-surface-border bg-surface-raised p-6">
        <h2 className="font-medium text-content-strong">
          {dict.progress.weakSpots}
        </h2>

        {weak.length === 0 ? (
          <p className="mt-2 text-sm text-content-faint">
            {dict.progress.weakEmpty}
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weak.map((item) => (
              <li
                key={item.prompt + item.reading}
                className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-base p-3"
              >
                <span className="font-jp text-2xl text-content-strong">
                  {item.prompt}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-content-base">
                    {item.reading}
                  </p>
                  <p className="text-xs text-content-faint">
                    {Math.round(item.accuracy * 100)}% {dict.progress.accuracy}{" "}
                    · {item.reviews} {dict.progress.reviews}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <KanaTable
        title={dict.progress.hiragana}
        rows={hiragana}
        dict={dict}
      />
      <KanaTable
        title={dict.progress.katakana}
        rows={katakana}
        dict={dict}
      />

      <section className="rounded-card border border-surface-border bg-surface-raised p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium text-content-strong">
            {dict.progress.vocabulary}
          </h2>
          <p className="text-sm text-content-muted">
            {words.filter((word) => word.known).length} {dict.progress.known} ·{" "}
            {words.length} {dict.progress.started}
          </p>
        </div>

        {words.length === 0 ? (
          <p className="mt-2 text-sm text-content-faint">
            {dict.progress.noWords}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-surface-border">
            {words.map((word) => (
              <li
                key={word.id}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="font-jp text-lg text-content-strong">
                  {word.character}
                </span>
                <span className="font-jp text-sm text-content-faint">
                  {word.reading}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-content-base">
                  {word.meaning}
                </span>
                {word.level && (
                  <span className="text-xs text-content-faint">
                    {word.level}
                  </span>
                )}
                <span
                  className={`size-2 rounded-full ${word.known ? "bg-accent" : "bg-surface-overlay"}`}
                  title={word.known ? dict.progress.known : dict.progress.started}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
