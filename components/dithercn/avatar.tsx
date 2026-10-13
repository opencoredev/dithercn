import { Children, isValidElement } from "react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { bloomStyle, cssColor, isInked } from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherColorName,
  FillVariant,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * A face from a string. The string seeds a small random generator, which
 * fills one half of a 5x5 grid of blocks; the other half mirrors it. Our
 * rules: a block's chance of being on falls with its distance from the
 * centre, so every face is a compact, centred mark rather than noise; the
 * centre column always holds at least two blocks; and each block is
 * either full or half tone, half tone likelier at the edges. Every block
 * is 4x4 cells, so half tone is a real Bayer level (gradient), a texture
 * (dotted, hatched) or an opacity step (solid). Behind the face sits a
 * lit disc of sparse dither in the same colour, densest up and to the
 * left, kept one cell clear of the face so the mark stays crisp. The same
 * string always draws the same face, on the server and in the browser.
 */

const GRID = 5;
const HALF = Math.ceil(GRID / 2);
const SUB = 4;
const PAD = 1.5;
const VIEW = GRID * SUB + PAD * 2 * SUB;

/** The hues an avatar picks from when it has no `color`. */
const AVATAR_HUES = [
  "blue",
  "purple",
  "green",
  "pink",
  "orange",
  "red",
] as const satisfies readonly DitherColorName[];

const MODULUS = 2_147_483_647;

/** A stable seed for a string: a polynomial hash, kept under 2^31. */
const seedOf = (value: string) => {
  let hash = 7;
  for (const char of value) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % MODULUS;
  }
  return hash === 0 ? 1 : hash;
};

/** A Park-Miller generator: the same seed gives the same sequence. */
const generator = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 48_271) % MODULUS;
    return state / MODULUS;
  };
};

/** The tone of each block, row by row. 0 is off. */
export type AvatarFace = readonly (readonly number[])[];

const TONES = [0.5, 1] as const;

/** The face for a string. Exported so you can reuse it, e.g. in an OG image. */
export const avatarFace = (value: string): AvatarFace => {
  const random = generator(seedOf(value));
  const centre = (GRID - 1) / 2;
  const reach = Math.hypot(centre, centre);
  const rows = Array.from({ length: GRID }, (_, y) => {
    const half = Array.from({ length: HALF }, (_unused, x) => {
      const near = 1 - Math.hypot(x - centre, y - centre) / reach;
      // The corner blocks stay off, so a circle never clips the face.
      if (random() > 0.3 + 0.75 * near || near < 0.05) {
        return 0;
      }
      // Full blocks are likelier near the centre.
      return random() < 0.25 + 0.6 * near ? TONES[1] : TONES[0];
    });
    return [...half, ...half.slice(0, GRID - HALF).toReversed()];
  });
  // At least two blocks down the middle, so the face has a spine.
  const spine = rows.filter((row) => (row[centre] ?? 0) > 0).length;
  if (spine < 2) {
    for (const y of [1, 2, 3]) {
      const row = rows[y];
      if (row) {
        row.splice(centre, 1, TONES[1]);
      }
    }
  }
  return rows;
};

/** Whether any block of the face covers a cell or touches it. */
const faceNear = (face: AvatarFace, x: number, y: number) => {
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const bx = Math.floor((x + ox - PAD * SUB) / SUB);
      const by = Math.floor((y + oy - PAD * SUB) / SUB);
      if ((face[by]?.[bx] ?? 0) > 0) {
        return true;
      }
    }
  }
  return false;
};

/** Tone of the lit disc behind the face: up to a quarter, from the top left. */
const discTone = (x: number, y: number) => {
  const nx = (x + 0.5 - VIEW / 2) / (VIEW / 2);
  const ny = (y + 0.5 - VIEW / 2) / (VIEW / 2);
  const light = 1 - Math.hypot(nx + 0.45, ny + 0.45) / 1.6;
  return 0.26 * Math.max(0, light) ** 1.3;
};

/** The disc behind a face, in cells, as one SVG path. */
const discPath = (face: AvatarFace) => {
  let d = "";
  for (let y = 0; y < VIEW; y += 1) {
    for (let x = 0; x < VIEW; x += 1) {
      if (!faceNear(face, x, y) && isInked("bayer4", x, y, discTone(x, y))) {
        d += `M${x} ${y}h1v1h-1z`;
      }
    }
  }
  return d;
};

/** The palette name an avatar uses for a string without its own `color`. */
export const avatarColor = (value: string): DitherColorName =>
  AVATAR_HUES[seedOf(`${value}:hue`) % AVATAR_HUES.length] ?? "blue";

const mod4 = (value: number) => value % 4;

/** Whether a cell of a block at `tone` is inked, for each textured fill. */
const TEXTURE = {
  dotted: (x: number, y: number) => y % 2 === 0 && (mod4(x) + y / 2) % 2 === 0,
  hatched: (x: number, y: number) => mod4(x + y) === 3,
} as const;

/** Opacity of a solid half-tone block. */
const SOLID_HALF = 0.45;

const solidOpacity = (tone: number) => (tone >= 1 ? 1 : SOLID_HALF);

const cellInked = (fill: FillVariant, tone: number, x: number, y: number) => {
  switch (fill) {
    case "gradient": {
      return isInked("bayer4", x, y, tone);
    }
    case "dotted":
    case "hatched": {
      return tone >= 1 || TEXTURE[fill](x, y);
    }
    case "solid": {
      return true;
    }
    default: {
      const exhaustive: never = fill;
      return exhaustive;
    }
  }
};

interface FacePaths {
  /** The face, grouped by opacity (several only for `solid`). */
  blocks: readonly { opacity: number; d: string }[];
  /** The lit disc behind it. */
  disc: string;
}

const pathCache = new Map<string, FacePaths>();

/** SVG paths for a face and its disc. */
const facePaths = (value: string, fill: FillVariant): FacePaths => {
  const key = `${fill}:${value}`;
  const cached = pathCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const groups = new Map<number, string>();
  const face = avatarFace(value);
  for (const [by, row] of face.entries()) {
    for (const [bx, tone] of row.entries()) {
      if (tone > 0) {
        const opacity = fill === "solid" ? solidOpacity(tone) : 1;
        let d = groups.get(opacity) ?? "";
        for (let y = 0; y < SUB; y += 1) {
          for (let x = 0; x < SUB; x += 1) {
            if (cellInked(fill, tone, x, y)) {
              d += `M${PAD * SUB + bx * SUB + x} ${PAD * SUB + by * SUB + y}h1v1h-1z`;
            }
          }
        }
        groups.set(opacity, d);
      }
    }
  }
  const paths = {
    blocks: [...groups].map(([opacity, d]) => ({ d, opacity })),
    disc: discPath(face),
  };
  pathCache.set(key, paths);
  return paths;
};

export type AvatarStatus = "online" | "away" | "busy" | "offline";

const STATUS_COLOR = {
  away: "orange",
  busy: "red",
  offline: "grey",
  online: "green",
} as const satisfies Record<AvatarStatus, DitherColorName>;

const STATUS_LABEL = {
  away: "away",
  busy: "busy",
  offline: "offline",
  online: "online",
} as const satisfies Record<AvatarStatus, string>;

export type AvatarProps = Omit<ComponentProps<"span">, "children" | "color"> & {
  /** The string the face is drawn from, usually a name, email or id. Also the accessible name. */
  name: string;
  /** Accessible name when `name` is an id. Default `name`. */
  label?: string;
  /** Diameter in pixels. Default 40, or the group's size. */
  size?: number;
  /** A palette name or any CSS colour. Default: picked from `name`. */
  color?: DitherColor;
  /** How each block is drawn. Default `"gradient"`. */
  fill?: FillVariant;
  /** `circle` or a rounded `square`. Default `"circle"`. */
  shape?: "circle" | "square";
  /** A ring in the avatar's colour, for the current user or a selection. Default `false`. */
  ring?: boolean;
  /** A presence dot in the corner, announced with the name. */
  status?: AvatarStatus;
  /** A soft glow in the avatar's colour. Default `"off"`. */
  bloom?: Bloom;
};

type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

/**
 * A generative avatar: a mirrored dither face drawn from a string. The
 * same string always gives the same face and colour, so it works as a
 * placeholder for people without a photo, for teams, bots and projects.
 */
export const Avatar = ({
  name,
  label,
  size,
  color,
  fill = "gradient",
  shape = "circle",
  ring = false,
  status,
  bloom = "off",
  className,
  style,
  ...props
}: AvatarProps) => {
  const tint = color ?? avatarColor(name);
  const paths = facePaths(name, fill);
  const ink = cssColor(tint);
  const outline =
    "0 0 0 var(--avatar-outline-width, 0px) var(--avatar-outline, transparent)";
  const ringShadow = ring
    ? `, 0 0 0 calc(var(--avatar-outline-width, 0px) + 2px) var(--background), 0 0 0 calc(var(--avatar-outline-width, 0px) + 3.5px) ${ink}`
    : "";
  const root: StyleWithVars = {
    "--avatar-ink": ink,
    backgroundColor: `color-mix(in oklab, ${ink} 11%, var(--card, transparent))`,
    boxShadow: `${outline}${ringShadow}`,
    height: size ?? "var(--avatar-size, 40px)",
    width: size ?? "var(--avatar-size, 40px)",
    ...style,
  };
  const accessibleName = `${label ?? name}${status ? `, ${STATUS_LABEL[status]}` : ""}`;
  return (
    <span
      role="img"
      aria-label={accessibleName}
      data-slot="avatar"
      data-status={status}
      {...props}
      className={cn(
        "relative inline-flex shrink-0 select-none",
        shape === "circle" ? "rounded-full" : "rounded-[22%]",
        className
      )}
      style={root}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        shapeRendering="crispEdges"
        className={cn(
          "size-full",
          shape === "circle" ? "rounded-full" : "rounded-[22%]"
        )}
        style={bloomStyle(tint, bloom)}
      >
        <path d={paths.disc} style={{ fill: ink, opacity: 0.6 }} />
        {paths.blocks.map(({ d, opacity }) => (
          <path key={opacity} d={d} style={{ fill: ink, opacity }} />
        ))}
      </svg>
      {status === undefined ? null : (
        <span
          aria-hidden="true"
          className="absolute right-[3%] bottom-[3%] size-[22%] max-h-4 max-w-4 min-h-2 min-w-2 rounded-full"
          style={{
            backgroundColor: cssColor(STATUS_COLOR[status]),
            boxShadow: "0 0 0 2px var(--avatar-outline, var(--background))",
          }}
        />
      )}
    </span>
  );
};

export type AvatarGroupProps = Omit<ComponentProps<"div">, "children"> & {
  /** `Avatar` elements. */
  children: ReactNode;
  /** Show at most this many, then a "+N" chip. Default: all. */
  max?: number;
  /** Diameter of every avatar in pixels. Default 32. */
  size?: number;
  /** Colour of the gap around each avatar: match the surface behind the group. Default `var(--background)`. */
  outline?: string;
  /** What the "+N" chip announces. Default `"N more"`. */
  moreLabel?: (count: number) => string;
};

/**
 * A row of overlapping avatars with a "+N" chip for the rest. Each avatar
 * gets a gap in the surface colour, and lifts a little on hover.
 */
export const AvatarGroup = ({
  children,
  max,
  size = 32,
  outline = "var(--background)",
  moreLabel = (count) => `${count} more`,
  className,
  style,
  ...props
}: AvatarGroupProps) => {
  const items = Children.toArray(children);
  const shown = max === undefined ? items : items.slice(0, Math.max(0, max));
  const rest = items.length - shown.length;
  const root: StyleWithVars = {
    "--avatar-outline": outline,
    "--avatar-outline-width": "2px",
    "--avatar-size": `${size}px`,
    ...style,
  };
  return (
    <div
      role="group"
      data-slot="avatar-group"
      {...props}
      className={cn(
        "flex items-center",
        "*:transition-transform *:duration-150 *:ease-(--ease-out) motion-reduce:*:transition-none",
        "[@media(hover:hover)]:*:hover:-translate-y-0.5",
        className
      )}
      style={root}
    >
      {shown.map((child, index) => (
        <span
          key={isValidElement(child) && child.key !== null ? child.key : index}
          className="relative inline-flex"
          style={{ marginLeft: index === 0 ? 0 : -Math.round(size * 0.28) }}
        >
          {child}
        </span>
      ))}
      {rest > 0 ? (
        <span
          role="img"
          aria-label={moreLabel(rest)}
          className="bg-muted text-muted-foreground relative inline-flex items-center justify-center rounded-full font-mono font-medium tabular-nums"
          style={{
            boxShadow: `0 0 0 2px ${outline}`,
            fontSize: Math.max(10, Math.round(size * 0.34)),
            height: size,
            marginLeft: -Math.round(size * 0.28),
            minWidth: size,
            paddingInline: Math.round(size * 0.18),
          }}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
};
