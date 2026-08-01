import Link from "next/link";
import { notFound } from "next/navigation";

import { VocabLesson, type VocabCard } from "@/components/learn/vocab-lesson";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/guards";
import { getNextWords, isVocabularyUnlocked } from "@/lib/srs/queue";

/** How many new words one lesson covers. */
const LESSON_SIZE = 5;

type Meanings = { de?: string[]; en?: string[] };

export default async function VocabLessonPage({
  params,
}: PageProps<"/[lang]/learn/vocab">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);

  const gate = await isVocabularyUnlocked(user.id);

  if (!gate.unlocked) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <span aria-hidden className="font-jp text-5xl text-content-faint">
          鍵
        </span>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.learn.vocab_locked}
        </h1>
        <p className="text-content-muted">
          {dict.learn.vocab_lockedBody
            .replace("{started}", String(gate.started))
            .replace("{total}", String(gate.total))}
        </p>
        <Link
          href={`/${lang}/learn/kana`}
          className="mt-2 rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-contrast hover:bg-accent-hover"
        >
          {dict.learn.vocab_toKana}
        </Link>
      </div>
    );
  }

  const words = await getNextWords(user.id, LESSON_SIZE);

  const cards: VocabCard[] = words.map((word) => {
    const meanings = word.meanings as Meanings;
    const link = word.sentences[0]?.sentence;
    const translations = link?.translations as Record<string, string> | null;

    return {
      id: word.id,
      written: word.written ?? word.reading,
      reading: word.reading,
      meaning: meanings[lang]?.[0] ?? meanings.en?.[0] ?? "",
      example: link
        ? { japanese: link.japanese, translation: translations?.[lang] ?? null }
        : null,
    };
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.learn.vocab_title}
        </h1>
        <p className="mt-2 text-content-muted">{dict.learn.vocab_intro}</p>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-card border border-dashed border-surface-border bg-surface-raised p-10 text-center text-content-faint">
          {dict.learn.vocab_allStarted}
        </p>
      ) : (
        <>
          <span className="self-start rounded-full bg-accent-soft px-3 py-1 text-sm text-content-strong">
            {dict.learn.vocab_newWords.replace("{count}", String(cards.length))}
          </span>
          <VocabLesson words={cards} dict={dict} locale={lang} />
        </>
      )}
    </div>
  );
}
