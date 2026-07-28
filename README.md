# LearnJP

Japanisch lernen von null bis JLPT N1 — durchgehender Lernpfad, Wiederholung
per Spaced Repetition, Übungsspiele und ein Avatar, den man sich erarbeitet.

> Der Produktname ist noch vorläufig. Er steckt an genau drei Stellen:
> `src/i18n/dictionaries/*.json` (`meta.appName`), `src/app/manifest.ts` und
> dieser Datei.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19**, **TypeScript**, **Tailwind CSS 4**
- **Prisma 7** + PostgreSQL
- **NextAuth 5** (Credentials, JWT-Session)
- Stripe (Abo), Resend (E-Mail), Sentry (Fehler), Anthropic SDK (KI-Korrektur)

Wichtig: Diese Next.js-Version weicht an mehreren Stellen von älteren ab.
Vor Änderungen die passende Seite unter `node_modules/next/dist/docs/` lesen —
siehe [AGENTS.md](AGENTS.md). Konkret bereits relevant:

- Middleware heißt **Proxy** (`src/proxy.ts`)
- `params` in Pages und Layouts ist ein Promise
- `PageProps<"/pfad">` / `LayoutProps<"/pfad">` sind globale Typ-Helfer, die
  Next erst beim ersten Dev-Lauf erzeugt

## Entwicklung

```bash
docker compose up -d          # PostgreSQL auf Port 5432
npm install
cp .env.example .env          # und AUTH_SECRET setzen
npx prisma migrate dev        # Schema anlegen
npm run dev                   # http://localhost:3000
```

Prüfen vor dem Commit:

```bash
npx tsc --noEmit && npx eslint .
```

## Aufbau

```
src/
  app/[lang]/(marketing)/   Landing, Preise, Rechtstexte
  app/[lang]/(auth)/        Login, Registrierung
  app/[lang]/(app)/         Alles hinter der Anmeldung
  app/api/                  Nur wo REST nötig ist (Auth-Handler, Stripe-Webhook)
  i18n/                     Wörterbücher de/en + Loader
  lib/                      Datenbank, Auth, Fachlogik
  components/               UI-Bausteine
  proxy.ts                  Sprachpräfix-Weiterleitung
prisma/                     Schema und Migrationen
```

## Sprachen

Jede Seiten-URL trägt ein Sprachpräfix (`/de/...`, `/en/...`). Ohne Präfix
leitet `src/proxy.ts` anhand von Cookie oder `Accept-Language` weiter.

Deutsch ist die Referenzsprache: `src/i18n/dictionaries/de.json` bestimmt die
Schlüsselstruktur, jede andere Sprache muss sie vollständig bedienen —
fehlt ein Schlüssel, schlägt der Typecheck fehl statt zur Laufzeit ein leeres
Label zu rendern.
