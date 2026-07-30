# Roadmap

Where the project stands and what is missing. Measured against the reference
product it is modelled on, and against the plan agreed at the start.

Last updated after the avatar system landed.

## Done

- **Foundation** — Next 16 App Router, locale-prefixed routes, English and
  German switchable in the UI, auth with registration and sign-in, Postgres +
  Prisma, Sentry, PWA manifest
- **Content pipeline** — importers for JMdict, KANJIDIC2, KanjiVG and Tatoeba;
  208 kana, 30,123 words, 10,384 kanji, 234,179 example sentences; JLPT levels
  derived for words and kanji; coverage report; credits page
- **Learning core** — FSRS scheduling, review sessions, kana lessons, streaks,
  daily activity, dashboard with heatmap and stat tiles
- **Avatar** — coins earned from reviews, transaction log, shop with rarities,
  wardrobe, appearance settings, first-party pixel artwork

## Blockers

These hold up more than one thing downstream. Worth doing first.

### 1. Grammar content does not exist

There is no open dataset for JLPT grammar. ~800 grammar points have to be
written. This blocks grammar lessons, grammar reviews, cheat sheets and the
grammar half of every progress screen.

Suggested approach: draft with the Anthropic API, edit by hand, N5 first
(~150 points). It is the only part of the project that code cannot solve.

### 2. Words are not linked to example sentences

`word_sentences` is empty. 234,179 sentences are imported but nothing connects
them to the 30,123 words, so a vocabulary card cannot show an example.

Needs Japanese tokenisation — matching by substring alone produces false hits
(「今日」 matches inside 「今日中」). Options: a morphological analyser, or
index by surface form plus reading and accept a curated subset.

Same for `kanji_words` (empty), which the kanji browser needs.

### 3. Radicals are not imported

`radicals` and `kanji_radicals` are empty. Radicals practice and kanji
breakdown both depend on this. KanjiVG carries component data in its element
attributes — the importer just doesn't read it yet.

### 4. German kanji meanings are missing entirely

0 of 10,384 kanji have a German meaning; KANJIDIC2 ships no German. Same
treatment as grammar: generate, then review.

## Next up

### Phase 3 — vocabulary and grammar

- Vocabulary lesson flow (flashcards for new words)
- Vocabulary and grammar in the review queue, not just kana
- Grammar lessons
- JLPT progress per level on the dashboard (N5–N1 counters)
- Progress screens: vocabulary, grammar, kanji, kana, conjugation — including
  the "focus area" analysis the review log already has the data for

### Phase 4 — path and reference

- Roadmap screen: the visual learning path with unlock states
- Teaching lessons as MDX ("What are kana?", "First words", "How sentences
  work")
- Cheat sheets by level and category
- Lesson guides for conjugation, kanji and sentence building

### Phase 5 — practice games

Eleven modes in the reference product, none built yet:

- Kana practice, kana speed
- Kanji practice, radicals practice
- Conjugation, numbers
- Reading with tap-to-lookup, listening, long-form listening
- Sentence builder, story builder (both with AI feedback)

Audio needs a decision: Web Speech API to start, behind an adapter so a TTS
service can replace it without a rewrite.

### Phase 6 — gamification, remainder

- Daily quests
- Mystery box
- More and better artwork — the current set is 14 items, and the twin tails
  read as a mop rather than twin tails
- Achievements

### Phase 7 — social

Friends, friend activity feed, leaderboard with time windows, public profiles,
Discord linking, invite links.

### Phase 8 — monetisation and launch

- Stripe: monthly, yearly, lifetime; free-tier limits; trial
- Pricing page, fuller landing page
- Legal pages (imprint, terms, privacy)
- Onboarding: level selection, "I already know kana"

## Gaps that don't fit a phase

- **Settings screen is missing entirely.** The columns exist — daily goals,
  review levels, audio speed, answer feedback, mascots, activity visibility —
  but there is no screen to change any of them, and no account deletion.
- **Email verification is prepared but not enforced**, and there is no
  password reset flow, though `AuthToken` covers both.
- **No per-user timezone.** `DailyActivity` works on UTC midnight, so a late
  evening session can be credited to the next day. Fix before the leaderboard.
- **N5/N4 vocabulary needs a curated list.** JMdict frequency comes from a
  newspaper corpus, so 「安保」 and 「委員長」 sit on N5.
- **No tests.** Not one. The SRS scheduler and the coin ledger are the two
  places where a silent regression would hurt most.
- **Mobile layout unverified.** Everything so far was checked at desktop width.
- **No admin or editing UI.** Fine while content comes from importers and the
  repo; needed once anyone else maintains content.
