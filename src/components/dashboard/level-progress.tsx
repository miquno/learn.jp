import type { Dictionary } from "@/i18n/get-dictionary";
import type { LevelProgress } from "@/lib/srs/stats";

type Props = { levels: LevelProgress[]; dict: Dictionary };

function Bar({ known, total }: { known: number; total: number }) {
  const share = total === 0 ? 0 : (known / total) * 100;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-overlay">
      <div
        className="h-full bg-accent"
        // Anything above zero gets at least a sliver, so "one word learned"
        // is visible instead of rounding away to an empty bar.
        style={{ width: share > 0 ? `${Math.max(share, 2)}%` : 0 }}
      />
    </div>
  );
}

export function LevelProgressPanel({ levels, dict }: Props) {
  const anything = levels.some(
    (level) => level.words.known > 0 || level.kanji.known > 0,
  );

  return (
    <section className="rounded-card border border-surface-border bg-surface-raised p-6">
      <h2 className="text-sm font-medium text-content-muted">
        {dict.dashboard.jlptProgress}
      </h2>

      {!anything && (
        <p className="mt-2 text-sm text-content-faint">
          {dict.dashboard.jlptEmpty}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-4">
        {levels.map((level) => (
          <li key={level.level} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-3">
            <span className="text-sm font-medium text-content-strong">
              {level.level}
            </span>

            <div>
              <div className="flex justify-between text-xs text-content-faint">
                <span>{dict.dashboard.words}</span>
                <span>
                  {level.words.known} / {level.words.total.toLocaleString()}
                </span>
              </div>
              <div className="mt-1">
                <Bar known={level.words.known} total={level.words.total} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-content-faint">
                <span>{dict.dashboard.kanji}</span>
                <span>
                  {level.kanji.known} / {level.kanji.total.toLocaleString()}
                </span>
              </div>
              <div className="mt-1">
                <Bar known={level.kanji.known} total={level.kanji.total} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
