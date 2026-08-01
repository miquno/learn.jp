"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { beginVocabLesson } from "@/app/[lang]/(app)/learn/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

export type VocabCard = {
  id: string;
  written: string;
  reading: string;
  meaning: string;
  example: { japanese: string; translation: string | null } | null;
};

type Props = { words: VocabCard[]; dict: Dictionary; locale: Locale };

export function VocabLesson({ words, dict, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);

  function begin() {
    startTransition(async () => {
      await beginVocabLesson(
        words.map((word) => word.id),
        locale,
      );
      setStarted(true);
      router.push(`/${locale}/review`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-content-muted">{dict.learn.lessonHint}</p>

      <ul className="flex flex-col gap-3">
        {words.map((word) => (
          <li
            key={word.id}
            className="rounded-card border border-surface-border bg-surface-raised p-5"
          >
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-jp text-3xl text-content-strong">
                {word.written}
              </span>
              {/* The reading only earns its space when it differs from the
                  written form — for kana-only words it would be a duplicate. */}
              {word.reading !== word.written && (
                <span className="font-jp text-lg text-accent">
                  {word.reading}
                </span>
              )}
              <span className="text-content-base">{word.meaning}</span>
            </div>

            {word.example && (
              <div className="mt-3 border-l-2 border-surface-border pl-3">
                <p className="font-jp text-content-base">
                  {word.example.japanese}
                </p>
                {word.example.translation && (
                  <p className="mt-0.5 text-sm text-content-faint">
                    {word.example.translation}
                  </p>
                )}
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
