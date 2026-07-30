# LearnJP

Learn Japanese from zero to JLPT N1 — one continuous path, spaced-repetition
reviews, practice games, and a character you earn piece by piece.

> The product name is still provisional. It lives in exactly three places:
> `src/i18n/dictionaries/*.json` (`meta.appName`), `src/app/manifest.ts` and
> this file.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19**, **TypeScript**, **Tailwind CSS 4**
- **Prisma 7** + PostgreSQL
- **NextAuth 5** (credentials, JWT sessions)
- **ts-fsrs** for review scheduling
- Stripe (subscription), Resend (email), Sentry (errors), Anthropic SDK (AI feedback)

Important: this version of Next.js differs from older ones in several places.
Read the relevant page under `node_modules/next/dist/docs/` before making
changes — see [AGENTS.md](AGENTS.md). Already relevant here:

- Middleware is now called **Proxy** (`src/proxy.ts`)
- `params` in pages and layouts is a Promise
- `PageProps<"/path">` / `LayoutProps<"/path">` are global type helpers that
  Next generates only on the first dev run

## Development

```bash
docker compose up -d          # PostgreSQL on port 5432
npm install
cp .env.example .env          # then set AUTH_SECRET
npx prisma migrate dev        # create the schema
npm run download              # fetch the raw content data (~70 MB)
npm run import                # import kana, words, kanji, sentences, shop items
npm run dev                   # http://localhost:3000
```

Check before committing:

```bash
npx tsc --noEmit && npx eslint .
```

Note: the Prisma client is cached on `globalThis` in development so hot reload
doesn't pile up connection pools. After `prisma generate` the running dev
server keeps the old instance and new tables read as `undefined` — restart it.

## Layout

```
src/
  app/[lang]/(marketing)/   Landing, pricing, legal, credits
  app/[lang]/(auth)/        Sign-in, registration
  app/[lang]/(app)/         Everything behind the login
  app/api/                  Only where REST is required (auth handler, Stripe webhook)
  i18n/                     Dictionaries de/en + loader
  lib/srs/                  FSRS scheduler, review queue, statistics
  lib/avatar/               Pixel artwork, palettes, outfit
  lib/                      Database, auth
  components/               UI building blocks
  proxy.ts                  Locale-prefix redirect
prisma/                     Schema and migrations
scripts/import/             Content importers
```

## Content

Learning content comes from open data (JMdict, KANJIDIC2, KanjiVG, Tatoeba)
and is imported by `scripts/import/`. All four sources require attribution —
the `/credits` page is a mandatory part of the app, not decoration.

`npm run import:stats` reports inventory, German coverage and completeness,
and names the known gaps.

## Languages

The app ships in **English only**. Every page URL still carries a locale
prefix (`/en/...`); without one, `src/proxy.ts` redirects based on a cookie or
`Accept-Language`.

The locale machinery is kept deliberately: adding a language back means adding
one JSON file under `src/i18n/dictionaries/` and one entry in
`src/i18n/config.ts` — not rewiring routing. `en.json` defines the key
structure through the derived `Dictionary` type, so any language added later
must cover it fully or the type check fails.

Note that the **content** in the database is still bilingual: JMdict supplies
German meanings for 29,052 words and Tatoeba German translations for 50,069
sentences. That data is kept rather than discarded — re-importing it costs a
full pass over the source files.
