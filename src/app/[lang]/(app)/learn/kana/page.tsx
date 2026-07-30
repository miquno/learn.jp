import { notFound } from "next/navigation";

import { KanaLesson } from "@/components/learn/kana-lesson";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/guards";
import { getNextKana } from "@/lib/srs/queue";

/** How many new characters one lesson covers. */
const LESSON_SIZE = 5;

export default async function KanaLessonPage({
  params,
}: PageProps<"/[lang]/learn/kana">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);
  const kana = await getNextKana(user.id, LESSON_SIZE);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.learn.kanaTitle}
        </h1>
        <p className="mt-2 text-content-muted">{dict.learn.kanaIntro}</p>
      </div>

      {kana.length === 0 ? (
        <p className="rounded-card border border-dashed border-surface-border bg-surface-raised p-10 text-center text-content-faint">
          {dict.learn.allStarted}
        </p>
      ) : (
        <>
          <span className="self-start rounded-full bg-accent-soft px-3 py-1 text-sm text-content-strong">
            {dict.learn.newToday.replace("{count}", String(kana.length))}
          </span>
          <KanaLesson
            kana={kana.map(({ id, character, romaji }) => ({
              id,
              character,
              romaji,
            }))}
            dict={dict}
            locale={lang}
          />
        </>
      )}
    </div>
  );
}
