import Link from "next/link";
import { notFound } from "next/navigation";

import {
  GrammarLesson,
  type GrammarCard,
} from "@/components/learn/grammar-lesson";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/guards";
import { getNextGrammar, isGrammarUnlocked } from "@/lib/srs/queue";

/** How many new grammar points one lesson covers. */
const LESSON_SIZE = 3;

type Localised = { de?: string; en?: string };
type Example = { japanese: string; translations: Record<string, string> };

export default async function GrammarLessonPage({
  params,
}: PageProps<"/[lang]/learn/grammar">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);

  const gate = await isGrammarUnlocked(user.id);

  if (!gate.unlocked) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <span aria-hidden className="font-jp text-5xl text-content-faint">
          鍵
        </span>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.learn.grammar_locked}
        </h1>
        <p className="text-content-muted">
          {dict.learn.grammar_lockedBody
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

  const points = await getNextGrammar(user.id, LESSON_SIZE);

  const cards: GrammarCard[] = points.map((point) => {
    const meaning = point.meaning as Localised;
    const explanation = point.explanation as Localised;
    const examples = point.examples as unknown as Example[];

    return {
      id: point.id,
      title: point.title,
      structure: point.structure,
      meaning: meaning[lang] ?? meaning.en ?? "",
      explanation: explanation[lang] ?? explanation.en ?? "",
      examples: examples.map((example) => ({
        japanese: example.japanese,
        translation: example.translations[lang] ?? null,
      })),
    };
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.learn.grammar_title}
        </h1>
        <p className="mt-2 text-content-muted">{dict.learn.grammar_intro}</p>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-card border border-dashed border-surface-border bg-surface-raised p-10 text-center text-content-faint">
          {/* Two reasons for an empty lesson: everything started, or nothing
              published yet. The learner can't tell which from an empty list,
              so both messages exist — this one covers "nothing published". */}
          {dict.learn.grammar_none}
        </p>
      ) : (
        <>
          <span className="self-start rounded-full bg-accent-soft px-3 py-1 text-sm text-content-strong">
            {dict.learn.grammar_newToday.replace("{count}", String(cards.length))}
          </span>
          <GrammarLesson points={cards} dict={dict} locale={lang} />
        </>
      )}
    </div>
  );
}
