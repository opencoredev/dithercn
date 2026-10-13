import { SITE } from "@/constants/site";

/** Satori markup shared by /og and /og/docs/*. Hex colours only. */
const INK = "#000000";
const PAPER = "#fafafa";
const BLUE = "#9aa3ff";
const MUTED = "#a3a3a3";

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

const DOT = 6;
const LEVELS = 17;
const STEP_WIDTH = 1200 / LEVELS;

const Ramp = () => (
  <svg
    width="1200"
    height="96"
    viewBox="0 0 1200 96"
    style={{ bottom: 0, left: 0, position: "absolute" }}
  >
    {Array.from({ length: LEVELS }, (_, level) => {
      const x0 = Math.round(level * STEP_WIDTH);
      const cols = Math.floor(STEP_WIDTH / DOT) - 1;
      return Array.from({ length: 96 / DOT }, (_row, y) =>
        Array.from({ length: cols }, (_col, x) =>
          BAYER_4[y % 4][x % 4] < level ? (
            <rect
              key={`${level}-${x}-${y}`}
              x={x0 + x * DOT}
              y={y * DOT}
              width={DOT}
              height={DOT}
              fill={BLUE}
            />
          ) : null
        )
      );
    })}
  </svg>
);

export const OgCard = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <div
    style={{
      background: INK,
      color: PAPER,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: "72px 80px",
      position: "relative",
      width: "100%",
    }}
  >
    <div
      style={{
        alignItems: "center",
        color: BLUE,
        display: "flex",
        fontSize: 32,
        gap: 16,
      }}
    >
      <svg width="34" height="34" viewBox="0 0 23 23">
        {(
          [
            [0, 0],
            [2, 0],
            [3, 0],
            [1, 1],
            [3, 1],
            [2, 2],
            [3, 2],
            [1, 3],
            [2, 3],
            [3, 3],
          ] as const
        ).map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x * 6}
            y={y * 6}
            width="5"
            height="5"
            fill={BLUE}
          />
        ))}
      </svg>
      {SITE.NAME}
    </div>
    <div
      style={{
        display: "flex",
        fontSize: title.length > 28 ? 64 : 80,
        fontWeight: 600,
        letterSpacing: "-0.035em",
        lineHeight: 1.04,
        marginTop: 56,
        maxWidth: 980,
      }}
    >
      {title}
    </div>
    {description ? (
      <div
        style={{
          color: MUTED,
          display: "flex",
          fontSize: 32,
          lineHeight: 1.4,
          marginTop: 28,
          maxWidth: 940,
        }}
      >
        {description}
      </div>
    ) : null}
    <Ramp />
  </div>
);
