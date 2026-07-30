import {
  ITEM_PALETTES,
  resolveColors,
  type AvatarColors,
} from "@/lib/avatar/palette";
import {
  ALL_PARTS,
  BODIES,
  GRID_HEIGHT,
  GRID_WIDTH,
  type Part,
} from "@/lib/avatar/parts";

export type AvatarView = {
  base: "feminine" | "masculine";
  skinTone: string;
  hairColor: string;
  /** Artwork key per layer, in draw order. */
  layers: string[];
};

type Run = { x: number; y: number; width: number; fill: string };

/**
 * Turns a character grid into horizontal runs.
 *
 * One rectangle per pixel would be up to 560 elements per layer. Merging
 * same-coloured neighbours typically cuts that to a tenth — for a character
 * that appears dozens of times in lists, that is the difference between
 * smooth and sluggish.
 */
function toRuns(part: Part, colors: AvatarColors): Run[] {
  const runs: Run[] = [];

  part.rows.forEach((row, rowIndex) => {
    const y = part.offsetY + rowIndex;
    let start = -1;
    let fill = "";

    const flush = (end: number) => {
      if (start !== -1) runs.push({ x: start, y, width: end - start, fill });
      start = -1;
    };

    for (let x = 0; x < row.length; x += 1) {
      const role = part.legend[row[x]];
      const color = role ? colors[role] : null;

      if (!color) {
        flush(x);
        continue;
      }
      if (start === -1) {
        start = x;
        fill = color;
      } else if (color !== fill) {
        flush(x);
        start = x;
        fill = color;
      }
    }
    flush(row.length);
  });

  return runs;
}

export function Avatar({
  view,
  size = 160,
  className,
}: {
  view: AvatarView;
  size?: number;
  className?: string;
}) {
  const body = BODIES[view.base];

  // Backgrounds first, then the body, then everything worn — the order in
  // `layers` decides what sits on top.
  const parts: { part: Part; colors: AvatarColors }[] = [];

  for (const key of view.layers) {
    const part = ALL_PARTS[key];
    if (!part) continue;
    if (!key.startsWith("bg_")) continue;
    parts.push({
      part,
      colors: resolveColors(view.skinTone, view.hairColor, ITEM_PALETTES[key]),
    });
  }

  parts.push({
    part: body,
    colors: resolveColors(view.skinTone, view.hairColor),
  });

  for (const key of view.layers) {
    const part = ALL_PARTS[key];
    if (!part || key.startsWith("bg_")) continue;
    parts.push({
      part,
      colors: resolveColors(view.skinTone, view.hairColor, ITEM_PALETTES[key]),
    });
  }

  return (
    <svg
      viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`}
      width={size}
      height={(size / GRID_WIDTH) * GRID_HEIGHT}
      // Without this the browser smooths when scaling up and pixel art turns
      // to mush.
      style={{ imageRendering: "pixelated", shapeRendering: "crispEdges" }}
      className={className}
      role="img"
      aria-label="Avatar"
    >
      {parts.map(({ part, colors }, layerIndex) =>
        toRuns(part, colors).map((run) => (
          <rect
            key={`${layerIndex}-${run.y}-${run.x}`}
            x={run.x}
            y={run.y}
            width={run.width}
            height={1}
            fill={run.fill}
          />
        )),
      )}
    </svg>
  );
}
