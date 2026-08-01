import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { LevelProgressPanel } from "@/components/dashboard/level-progress";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/guards";
import {
  getActivity,
  getDashboardStats,
  getLevelProgress,
} from "@/lib/srs/stats";

function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="rounded-card border border-surface-border bg-surface-raised p-5">
      <p className="text-sm text-content-faint">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-content-strong">{value}</p>
      {unit && <p className="text-sm text-content-muted">{unit}</p>}
    </div>
  );
}

function ProgressBar({
  label,
  glyph,
  known,
  total,
}: {
  label: string;
  glyph: string;
  known: number;
  total: number;
}) {
  const share = total === 0 ? 0 : Math.round((known / total) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-content-base">
          <span aria-hidden className="font-jp mr-2 text-accent">
            {glyph}
          </span>
          {label}
        </span>
        <span className="text-content-muted">{share}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-overlay">
        <div className="h-full bg-accent" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export default async function DashboardPage({
  params,
}: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);
  const [stats, activity, levels] = await Promise.all([
    getDashboardStats(user.id),
    getActivity(user.id),
    getLevelProgress(user.id),
  ]);

  const kanaComplete =
    stats.kana.hiragana.known >= stats.kana.hiragana.total &&
    stats.kana.katakana.known >= stats.kana.katakana.total;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.dashboard.title}
        </h1>
        <p className="mt-1 text-content-muted">
          {dict.dashboard.welcome.replace("{name}", user.username)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={dict.dashboard.streak}
          value={user.currentStreak}
          unit={dict.dashboard.streakUnit}
        />
        <StatTile
          label={dict.dashboard.dueNow}
          value={stats.due}
          unit={dict.dashboard.dueUnit}
        />
        <StatTile
          label={dict.dashboard.learned}
          value={stats.known}
          unit={dict.dashboard.learnedUnit}
        />
        <StatTile
          label={dict.dashboard.accuracy}
          value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ActivityHeatmap days={activity} dict={dict} locale={lang} />

        <section className="flex flex-col gap-4 rounded-card border border-surface-border bg-surface-raised p-6">
          <div>
            <h2 className="font-medium text-content-strong">
              {dict.dashboard.kanaProgress}
            </h2>
            {!kanaComplete && (
              <p className="mt-1 text-sm text-content-muted">
                {dict.dashboard.startHereBody}
              </p>
            )}
          </div>

          <ProgressBar
            label={dict.dashboard.hiragana}
            glyph="あ"
            known={stats.kana.hiragana.known}
            total={stats.kana.hiragana.total}
          />
          <ProgressBar
            label={dict.dashboard.katakana}
            glyph="ア"
            known={stats.kana.katakana.known}
            total={stats.kana.katakana.total}
          />

          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {/* Due reviews take priority over new material — otherwise the
                backlog grows while you start new things. */}
            {stats.due > 0 && (
              <Link
                href={`/${lang}/review`}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
              >
                {dict.dashboard.toReview}
              </Link>
            )}
            <Link
              href={`/${lang}/learn/kana`}
              className="rounded-lg border border-surface-border px-4 py-2.5 text-sm text-content-base hover:border-content-faint"
            >
              {dict.dashboard.toLesson}
            </Link>
          </div>
        </section>
      </div>

      <LevelProgressPanel levels={levels} dict={dict} />
    </div>
  );
}
