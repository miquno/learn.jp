"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { beginKanaLesson } from "@/app/[lang]/(app)/learn/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

type KanaCard = { id: string; character: string; romaji: string };

type Props = { kana: KanaCard[]; dict: Dictionary; locale: Locale };

export function KanaLesson({ kana, dict, locale }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);

  function begin() {
    startTransition(async () => {
      await beginKanaLesson(
        kana.map((entry) => entry.id),
        locale,
      );
      setStarted(true);
      router.push(`/${locale}/review`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-content-muted">{dict.learn.lessonHint}</p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {kana.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col items-center gap-1 rounded-card border border-surface-border bg-surface-raised py-6"
          >
            <span className="font-jp text-4xl text-content-strong">
              {entry.character}
            </span>
            <span className="text-sm text-content-muted">{entry.romaji}</span>
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
