import type { Dictionary } from "@/i18n/get-dictionary";
import type { KanaRow } from "@/lib/srs/progress";

type Props = { title: string; rows: KanaRow[]; dict: Dictionary };

/**
 * Three states rather than a gradient: not started, learning, known. A
 * continuous shade would suggest a precision the underlying FSRS state does
 * not have — a card is in a phase, not at a percentage.
 */
function tileClass(started: boolean, known: boolean) {
  if (known) return "border-accent bg-accent-soft text-content-strong";
  if (started) return "border-surface-border bg-surface-overlay text-content-base";
  return "border-surface-border/50 bg-transparent text-content-faint";
}

export function KanaTable({ title, rows, dict }: Props) {
  const all = rows.flatMap((row) => row.items);
  const started = all.filter((item) => item.started).length;
  const known = all.filter((item) => item.known).length;

  return (
    <section className="rounded-card border border-surface-border bg-surface-raised p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium text-content-strong">{title}</h2>
        <p className="text-sm text-content-muted">
          {known} {dict.progress.known} · {started} {dict.progress.started} /{" "}
          {all.length}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.row} className="flex flex-wrap gap-1.5">
            {row.items.map((item) => (
              <div
                key={item.id}
                // Accuracy in the tooltip rather than on the tile: it only
                // matters for the handful you keep getting wrong, and the
                // grid has to stay readable at a glance.
                title={
                  item.reviews > 0
                    ? `${item.character} · ${item.reading} · ${Math.round((item.correct / item.reviews) * 100)}% ${dict.progress.accuracy}`
                    : `${item.character} · ${item.reading}`
                }
                className={`flex size-11 flex-col items-center justify-center rounded-lg border ${tileClass(item.started, item.known)}`}
              >
                <span className="font-jp text-lg leading-none">
                  {item.character}
                </span>
                <span className="mt-0.5 text-[10px] leading-none opacity-70">
                  {item.reading}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-content-faint">
        {(
          [
            ["legendNew", tileClass(false, false)],
            ["legendLearning", tileClass(true, false)],
            ["legendKnown", tileClass(true, true)],
          ] as const
        ).map(([key, className]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`size-3 rounded border ${className}`} />
            {dict.progress[key]}
          </span>
        ))}
      </div>
    </section>
  );
}
