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
 * FSRS instead of SM-2 (the algorithm behind Anki and most of its clones):
 * FSRS models memory stability and difficulty separately and places review
 * times measurably better. `ts-fsrs` is MIT-licensed and the reference
 * implementation.
 *
 * Fuzz is enabled: without that small random spread, every card learned on
 * the same day stays clustered on the same day forever — after a few weeks
 * that means 300 reviews on one day and none the next.
 */
const scheduler = fsrs(
  generatorParameters({
    enable_fuzz: true,
    enable_short_term: true,
  }),
);

// `Grade` rather than `Rating`: FSRS also knows `Manual`, which is not allowed
// when scheduling. The app's four ratings are exactly the grades.
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

/** The fields of a stored card that matter to FSRS. */
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
  /** New card state, usable directly as a Prisma update. */
  card: StoredCard;
  /** State *before* the rating — goes into the log unchanged. */
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

/** Starting state for a newly begun card. */
export function emptyCard(now = new Date()): StoredCard {
  return fromFsrs(createEmptyCard(now));
}

/** Applies a rating and returns the new state plus a log entry. */
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
 * The four due dates on offer — for labelling the rating buttons
 * ("again · 10 min · 1 day · 4 days").
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
