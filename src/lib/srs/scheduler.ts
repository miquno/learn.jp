import "server-only";

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";

import type { SrsCard } from "@/generated/prisma/client";
import type { SrsRating, SrsState } from "@/generated/prisma/enums";

/**
 * FSRS statt SM-2 (dem Algorithmus von Anki und den meisten Klonen): FSRS
 * modelliert Gedächtnisstabilität und Schwierigkeit getrennt und trifft die
 * Wiederholungszeitpunkte messbar besser. `ts-fsrs` ist MIT-lizenziert und
 * die Referenzumsetzung.
 *
 * Fuzz ist eingeschaltet: ohne die kleine Zufallsstreuung sammeln sich alle
 * am selben Tag gelernten Karten für immer am selben Tag — nach ein paar
 * Wochen stehen dann 300 Wiederholungen an einem Tag und null am nächsten.
 */
const scheduler = fsrs(
  generatorParameters({
    enable_fuzz: true,
    enable_short_term: true,
  }),
);

// `Grade` statt `Rating`: FSRS kennt zusätzlich `Manual`, das beim Planen
// nicht erlaubt ist. Die vier Bewertungen der App sind genau die Grades.
const RATING_TO_FSRS: Record<SrsRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const STATE_TO_FSRS: Record<SrsState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const FSRS_TO_STATE: Record<State, SrsState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

/** Die für FSRS relevanten Felder einer gespeicherten Karte. */
type StoredCard = Pick<
  SrsCard,
  | "state"
  | "due"
  | "stability"
  | "difficulty"
  | "elapsedDays"
  | "scheduledDays"
  | "reps"
  | "lapses"
  | "learningSteps"
  | "lastReviewAt"
>;

export type ScheduleResult = {
  /** Neuer Kartenzustand, direkt als Prisma-Update verwendbar. */
  card: StoredCard;
  /** Zustand *vor* der Bewertung — wandert unverändert ins Protokoll. */
  log: {
    state: SrsState;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
  };
};

function toFsrs(card: StoredCard): FsrsCard {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learningSteps,
    state: STATE_TO_FSRS[card.state],
    last_review: card.lastReviewAt ?? undefined,
  };
}

function fromFsrs(card: FsrsCard): StoredCard {
  return {
    state: FSRS_TO_STATE[card.state],
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learning_steps,
    lastReviewAt: card.last_review ?? null,
  };
}

/** Ausgangszustand für eine neu begonnene Karte. */
export function emptyCard(now = new Date()): StoredCard {
  return fromFsrs(createEmptyCard(now));
}

/** Wendet eine Bewertung an und liefert neuen Zustand samt Protokolleintrag. */
export function schedule(
  card: StoredCard,
  rating: SrsRating,
  now = new Date(),
): ScheduleResult {
  const result = scheduler.next(toFsrs(card), now, RATING_TO_FSRS[rating]);

  return {
    card: fromFsrs(result.card),
    log: {
      state: FSRS_TO_STATE[result.log.state],
      stability: result.log.stability,
      difficulty: result.log.difficulty,
      elapsedDays: result.log.elapsed_days,
      scheduledDays: result.log.scheduled_days,
    },
  };
}

/**
 * Die vier Fälligkeitstermine, die zur Auswahl stehen — für die Beschriftung
 * der Antwortknöpfe („nochmal · 10 min · 1 Tag · 4 Tage").
 */
export function previewIntervals(card: StoredCard, now = new Date()) {
  const options = scheduler.repeat(toFsrs(card), now);
  return {
    again: options[Rating.Again].card.due,
    hard: options[Rating.Hard].card.due,
    good: options[Rating.Good].card.due,
    easy: options[Rating.Easy].card.due,
  } satisfies Record<SrsRating, Date>;
}
