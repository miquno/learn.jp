"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { submitAnswer } from "@/app/[lang]/(app)/learn/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ReviewItem } from "@/lib/srs/queue";

type Props = { items: ReviewItem[]; dict: Dictionary; locale: Locale };

type Phase = "question" | "revealed";

/** Vergleicht Eingabe und erwartete Lesung nachsichtig. */
function matches(input: string, expected: string) {
  const normalise = (value: string) =>
    value
      .trim()
      .toLowerCase()
      // Lange Vokale werden mal als "ou", mal als "ō", mal als "oo"
      // geschrieben. Wer し als "shi" erkennt, soll nicht an der Umschrift
      // scheitern — geprüft wird das Zeichen, nicht die Rechtschreibung.
      .replace(/[ōô]/g, "o")
      .replace(/[ūû]/g, "u")
      .replace(/\s+/g, "");
  return normalise(input) === normalise(expected);
}

export function ReviewSession({ items, dict, locale }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [input, setInput] = useState("");
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [, startTransition] = useTransition();
  const shownAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const item = items[index];
  const finished = index >= items.length;

  // Die Uhr läuft ab dem Moment, in dem die Karte tatsächlich sichtbar ist.
  // Im Effekt statt im Render-Pfad, weil die Uhrzeit keine reine Funktion des
  // Zustands ist und React den Render sonst nicht wiederholen dürfte.
  useEffect(() => {
    // performance.now() statt Date.now(), weil `event.timeStamp` in den
    // Ereignissen unten auf derselben Uhr liegt — Date.now() hätte einen
    // anderen Nullpunkt und die Differenz wäre Unsinn.
    shownAt.current = performance.now();
    inputRef.current?.focus();
  }, [index]);

  function advance() {
    setIndex((current) => current + 1);
    setPhase("question");
    setInput("");
    setWasCorrect(null);
  }

  function record(
    rating: "again" | "hard" | "good" | "easy",
    at: number,
  ) {
    const duration = at - shownAt.current;
    const cardId = item.cardId;
    // Die Antwort wandert im Hintergrund zum Server. Die nächste Karte
    // erscheint sofort — Wiederholen soll sich nicht wie Warten anfühlen.
    startTransition(async () => {
      await submitAnswer(cardId, rating, duration);
    });
    if (rating !== "again") setCorrectCount((count) => count + 1);
  }

  /** `at` kommt aus dem Ereignis — der Zeitstempel ist damit kein Seiteneffekt. */
  function checkTyped(at: number) {
    if (phase === "revealed") {
      advance();
      return;
    }
    const correct = matches(input, item.reading);
    setWasCorrect(correct);
    setPhase("revealed");
    record(correct ? "good" : "again", at);
  }

  if (finished) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <span aria-hidden className="font-jp text-5xl text-accent">
          達
        </span>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.review.done}
        </h1>
        <p className="text-content-muted">
          {dict.review.doneBody
            .replace("{correct}", String(correctCount))
            .replace("{total}", String(items.length))}
        </p>
        <Link
          href={`/${locale}/dashboard`}
          onClick={() => router.refresh()}
          className="mt-2 rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-contrast hover:bg-accent-hover"
        >
          {dict.review.backToDashboard}
        </Link>
      </div>
    );
  }

  const isTyped = item.itemType === "kana";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      <div className="flex items-center justify-between text-sm text-content-faint">
        <span>{dict.review.title}</span>
        <span>
          {dict.review.remaining.replace(
            "{count}",
            String(items.length - index),
          )}
        </span>
      </div>

      <div
        className="h-1 w-full overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuenow={index}
        aria-valuemin={0}
        aria-valuemax={items.length}
      >
        <div
          className="h-full bg-accent transition-[width]"
          style={{ width: `${(index / items.length) * 100}%` }}
        />
      </div>

      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-card border border-surface-border bg-surface-raised p-10">
        <span className="font-jp text-7xl text-content-strong">
          {item.prompt}
        </span>
        {phase === "revealed" && (
          <div className="text-center">
            <p className="text-xl text-accent">{item.reading}</p>
            {item.meaning && (
              <p className="mt-1 text-content-muted">{item.meaning}</p>
            )}
          </div>
        )}
      </div>

      {isTyped ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            checkTyped(event.timeStamp);
          }}
          className="flex flex-col gap-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            readOnly={phase === "revealed"}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={dict.review.typeRomaji}
            aria-label={dict.review.typeRomaji}
            className={`w-full rounded-lg border bg-surface-base px-4 py-3 text-center text-lg text-content-strong placeholder:text-content-faint ${
              wasCorrect === null
                ? "border-surface-border"
                : wasCorrect
                  ? "border-positive"
                  : "border-negative"
            }`}
          />

          {phase === "revealed" && (
            <p
              role="status"
              className={`text-center text-sm ${wasCorrect ? "text-positive" : "text-negative"}`}
            >
              {wasCorrect
                ? dict.review.correct
                : dict.review.wrong.replace("{answer}", item.reading)}
            </p>
          )}

          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-3 font-medium text-accent-contrast hover:bg-accent-hover"
          >
            {phase === "question" ? dict.review.check : dict.review.continue}
          </button>
        </form>
      ) : phase === "question" ? (
        <button
          type="button"
          onClick={() => setPhase("revealed")}
          className="rounded-lg bg-accent px-4 py-3 font-medium text-accent-contrast hover:bg-accent-hover"
        >
          {dict.review.showAnswer}
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {(["again", "hard", "good", "easy"] as const).map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={(event) => {
                record(rating, event.timeStamp);
                advance();
              }}
              className="rounded-lg border border-surface-border py-3 text-sm text-content-base hover:border-content-faint"
            >
              {dict.review[rating]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
