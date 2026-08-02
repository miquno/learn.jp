"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { beginGrammarLesson } from "@/app/[lang]/(app)/learn/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

export type GrammarCard = {
  id: string;
  title: string;
  structure: string;
  meaning: string;
  explanation: string;
  examples: { japanese: string; translation: string | null }[];
};

type Props = { points: GrammarCard[]; dict: Dictionary; locale: Locale };

export function GrammarLesson({ points, dict, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);

  function begin() {
    startTransition(async () => {
      await beginGrammarLesson(
        points.map((point) => point.id),
        locale,
      );
      setStarted(true);
      router.push(`/${locale}/review`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-content-muted">{dict.learn.lessonHint}</p>

      <ul className="flex flex-col gap-4">
        {points.map((point) => (
          <li
            key={point.id}
            className="rounded-card border border-surface-border bg-surface-raised p-5"
          >
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-jp text-2xl text-content-strong">
                {point.title}
              </span>
              <span className="text-content-base">{point.meaning}</span>
            </div>

            <p className="mt-1 text-sm text-content-faint">
              {dict.learn.grammar_structure}: {point.structure}
            </p>

            <p className="mt-3 text-sm text-content-base">{point.explanation}</p>

            {point.examples.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 border-l-2 border-surface-border pl-3">
                {point.examples.map((example, index) => (
                  <div key={index}>
                    <p className="font-jp text-content-base">
                      {example.japanese}
                    </p>
                    {example.translation && (
                      <p className="text-sm text-content-faint">
                        {example.translation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={begin}
        disabled={pending || started}
        className="self-start rounded-lg bg-accent px-5 py-3 font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {dict.learn.toReview}
      </button>
    </div>
  );
}
