import type { Dictionary } from "@/i18n/get-dictionary";
import type { ActivityDay } from "@/lib/srs/stats";

type Props = { days: ActivityDay[]; dict: Dictionary; locale: string };

/**
 * Four levels rather than a continuous scale: the point is to see *whether*
 * studying happened, not exactly how much. Finer gradations aren't
 * distinguishable on 12-pixel squares anyway.
 */
function level(reviews: number) {
  if (reviews === 0) return 0;
  if (reviews < 10) return 1;
  if (reviews < 30) return 2;
  if (reviews < 60) return 3;
  return 4;
}

const SHADES = [
  "bg-surface-overlay",
  "bg-accent-soft",
  "bg-accent/60",
  "bg-accent/80",
  "bg-accent",
];

export function ActivityHeatmap({ days, dict, locale }: Props) {
  // Split into week columns. The data arrives gap-free and Sunday-aligned
  // from getActivity, so plain slicing is enough.
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  });
  const hasActivity = days.some((day) => day.reviews > 0);

  return (
    <section className="rounded-card border border-surface-border bg-surface-raised p-6">
      <h2 className="text-sm font-medium text-content-muted">
        {dict.dashboard.activity}
      </h2>

      {hasActivity ? (
        <>
          <div
            className="mt-4 flex gap-1 overflow-x-auto pb-1"
            role="img"
            aria-label={dict.dashboard.activity}
          >
            {weeks.map((week) => (
              <div key={week[0].date} className="flex flex-col gap-1">
                {week.map((day) => (
                  <span
                    key={day.date}
                    title={`${formatter.format(new Date(day.date))} · ${day.reviews}`}
                    className={`size-3 rounded-[3px] ${SHADES[level(day.reviews)]}`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-content-faint">
            <span>{dict.dashboard.less}</span>
            {SHADES.map((shade) => (
              <span key={shade} className={`size-3 rounded-[3px] ${shade}`} />
            ))}
            <span>{dict.dashboard.more}</span>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-content-faint">
          {dict.dashboard.activityEmpty}
        </p>
      )}
    </section>
  );
}
