/**
 * Areas built from whole dither cells. A chart's area under a curve, filled
 * with a dither pattern and clipped by the smooth curve, cuts the cells along
 * its edge in half. These helpers instead test each cell column at its centre
 * and keep only whole cells, so the edge steps along the grid.
 *
 * Every cell sits on the grid from the SVG's origin, the same grid
 * `DitherPattern` and `FillPattern` tile from, so each kept cell is exactly
 * one pattern cell.
 */

export interface CurvePoint {
  x: number;
  y: number;
}

/** `linear`: straight segments. `smooth`: monotone cubic, never overshooting. */
export type CurveKind = "linear" | "smooth";

/**
 * Tangents (dy/dx) for a monotone cubic through `points` (Fritsch–Carlson),
 * so peaks stay at the data. Charts draw their line from the same tangents.
 */
export const monotoneTangents = (points: readonly CurvePoint[]) => {
  const count = points.length;
  const slopes: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    slopes.push(a && b ? (b.y - a.y) / (b.x - a.x || 1) : 0);
  }
  const tangents = points.map((_, index) => {
    const before = slopes[index - 1];
    const after = slopes[index];
    if (before === undefined) {
      return after ?? 0;
    }
    if (after === undefined) {
      return before;
    }
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  for (let index = 0; index < count - 1; index += 1) {
    const slope = slopes[index] ?? 0;
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
    } else {
      const a = (tangents[index] ?? 0) / slope;
      const b = (tangents[index + 1] ?? 0) / slope;
      const length = a * a + b * b;
      if (length > 9) {
        const scale = 3 / Math.sqrt(length);
        tangents[index] = scale * a * slope;
        tangents[index + 1] = scale * b * slope;
      }
    }
  }
  return tangents;
};

/**
 * The curve through `points` (sorted by x) as a function of x. Outside the
 * points it holds the end values. `smooth` matches the Bézier path a chart
 * draws from `monotoneTangents`: with control points a third of the way
 * along, y is exactly the cubic Hermite in x.
 */
export const curveAt = (
  points: readonly CurvePoint[],
  curve: CurveKind = "linear"
): ((x: number) => number) => {
  const tangents =
    curve === "smooth" && points.length >= 3 ? monotoneTangents(points) : null;
  return (x) => {
    const [first] = points;
    const last = points.at(-1);
    if (!first || !last) {
      return 0;
    }
    if (x <= first.x) {
      return first.y;
    }
    if (x >= last.x) {
      return last.y;
    }
    let index = 0;
    while (index < points.length - 2 && (points[index + 1]?.x ?? 0) < x) {
      index += 1;
    }
    const a = points[index] ?? first;
    const b = points[index + 1] ?? last;
    const h = b.x - a.x || 1;
    const t = (x - a.x) / h;
    if (!tangents) {
      return a.y + (b.y - a.y) * t;
    }
    const t2 = t * t;
    const t3 = t2 * t;
    const m0 = (tangents[index] ?? 0) * h;
    const m1 = (tangents[index + 1] ?? 0) * h;
    return (
      (2 * t3 - 3 * t2 + 1) * a.y +
      (t3 - 2 * t2 + t) * m0 +
      (-2 * t3 + 3 * t2) * b.y +
      (t3 - t2) * m1
    );
  };
};

/**
 * The cells between `top` and `bottom` (functions of x, in px) from `from`
 * to `to`, as an SVG path of whole `cell`-sized squares. A cell is kept when
 * its centre lies between the edges. Neighbouring columns of the same height
 * merge into one rectangle to keep the path short.
 */
export const cellArea = ({
  top,
  bottom,
  from,
  to,
  cell,
}: {
  top: (x: number) => number;
  bottom: (x: number) => number;
  from: number;
  to: number;
  cell: number;
}) => {
  if (!(cell > 0) || !(to > from)) {
    return "";
  }
  let path = "";
  let run: { col: number; length: number; start: number; end: number } | null =
    null;
  const flush = () => {
    if (run) {
      const height = (run.end - run.start + 1) * cell;
      path += `M${run.col * cell} ${run.start * cell}h${run.length * cell}v${height}h${-run.length * cell}z`;
    }
    run = null;
  };
  const firstCol = Math.ceil(from / cell - 0.5);
  const lastCol = Math.floor(to / cell - 0.5);
  for (let col = firstCol; col <= lastCol; col += 1) {
    const x = (col + 0.5) * cell;
    const start = Math.ceil(top(x) / cell - 0.5);
    const end = Math.floor(bottom(x) / cell - 0.5);
    if (end < start) {
      flush();
      continue;
    }
    if (run && run.start === start && run.end === end) {
      run.length += 1;
    } else {
      flush();
      run = { col, end, length: 1, start };
    }
  }
  flush();
  return path;
};

/** `offset` rounded to whole cells, so shifted cell areas stay on the grid. */
export const snapToCells = (offset: number, cell: number) =>
  cell > 0 ? Math.round(offset / cell) * cell : offset;
