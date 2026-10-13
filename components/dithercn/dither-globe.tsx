"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ComponentProps,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";

import { landCoverage } from "@/components/dithercn/world-land";
import type { LatLon } from "@/components/dithercn/world-land";
import {
  thresholdAt,
  useDitherColors,
  useFrameLoop,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherColor, DitherMatrix, Rgba } from "@/lib/dither";
import { cn } from "@/lib/utils";

export type { LatLon } from "@/components/dithercn/world-land";

/** A pulsing location on the globe. */
export interface GlobeMarker {
  /** `[lat, lon]` in degrees. */
  at: LatLon;
  /** Default: the globe's `accent`. */
  color?: DitherColor;
}

/** A dotted arc that lifts off the surface between two places. */
export interface GlobeArc {
  from: LatLon;
  to: LatLon;
  /** Default: the globe's `accent`. */
  color?: DitherColor;
}

export type DitherGlobeProps = Omit<ComponentProps<"div">, "children"> & {
  /** Colour of the land and the atmosphere. Default `"ink"`. */
  color?: DitherColor;
  /** Colour of markers and arcs unless they set their own. Default `"orange"`. */
  accent?: DitherColor;
  /** Locations to mark. Markers on the far side are hidden. */
  markers?: readonly GlobeMarker[];
  /** Connections between places, lifted off the surface. */
  arcs?: readonly GlobeArc[];
  /** Degrees of rotation per second. Negative spins the other way. Default 6. */
  speed?: number;
  /** Longitude facing the viewer at the start, in degrees. Default 10. */
  start?: number;
  /** How far the north pole leans towards the viewer, in degrees. Default 18. */
  tilt?: number;
  /** Where the light comes from, in degrees clockwise from the top. Default 300 (upper left). */
  light?: number;
  /** Brightness of the sea on the lit side, 0 to 1. Default 0.18. */
  ocean?: number;
  /** A thin dithered glow around the lit rim. Default true. */
  atmosphere?: boolean;
  /** Let people drag sideways to spin the globe. Default true. */
  draggable?: boolean;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Spin and pulse. false draws one still frame; reduced motion does the same. Default true. */
  animate?: boolean;
};

const RADIANS = Math.PI / 180;
const RADIUS_SHARE = 0.42;

type Vec3 = readonly [number, number, number];

interface Disc {
  columns: number;
  rows: number;
  cx: number;
  cy: number;
  radius: number;
  /** Pixel index, then the view-space normal, for every pixel on the sphere. */
  sphere: Float32Array;
  /** Pixel index and glow strength for the atmosphere ring. */
  halo: Float32Array;
}

const buildDisc = (columns: number, rows: number): Disc => {
  const cx = columns / 2;
  const cy = rows / 2;
  const radius = Math.min(columns, rows) * RADIUS_SHARE;
  const sphere: number[] = [];
  const halo: number[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const nx = (x + 0.5 - cx) / radius;
      const ny = (cy - y - 0.5) / radius;
      const r2 = nx * nx + ny * ny;
      if (r2 <= 1) {
        sphere.push(y * columns + x, nx, ny, Math.sqrt(1 - r2));
      } else if (r2 < 1.16) {
        halo.push(y * columns + x, 1 - (Math.sqrt(r2) - 1) / 0.077);
      }
    }
  }
  return {
    columns,
    cx,
    cy,
    halo: Float32Array.from(halo),
    radius,
    rows,
    sphere: Float32Array.from(sphere),
  };
};

interface View {
  /** Rotation about the axis, radians. */
  spin: number;
  /** Tilt towards the viewer, radians. */
  tilt: number;
}

/** View space to the globe's own frame: undo the tilt, then the spin. */
const toWorld = ({ spin, tilt }: View, [x, y, z]: Vec3): Vec3 => {
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const y1 = y * cosT - z * sinT;
  const z1 = y * sinT + z * cosT;
  const cosS = Math.cos(spin);
  const sinS = Math.sin(spin);
  return [x * cosS + z1 * sinS, y1, -x * sinS + z1 * cosS];
};

/** The globe's frame to view space. */
const toView = ({ spin, tilt }: View, [x, y, z]: Vec3): Vec3 => {
  const cosS = Math.cos(spin);
  const sinS = Math.sin(spin);
  const x1 = x * cosS - z * sinS;
  const z1 = x * sinS + z * cosS;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  return [x1, y * cosT + z1 * sinT, -y * sinT + z1 * cosT];
};

const fromLatLon = ([lat, lon]: LatLon): Vec3 => {
  const phi = lat * RADIANS;
  const lambda = lon * RADIANS;
  return [
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi),
    Math.cos(phi) * Math.cos(lambda),
  ];
};

const lightVector = (degrees: number): Vec3 => {
  const angle = degrees * RADIANS;
  const x = Math.sin(angle) * 0.75;
  const y = Math.cos(angle) * 0.75;
  const length = Math.hypot(x, y, 0.62);
  return [x / length, y / length, 0.62 / length];
};

interface Paint {
  land: Rgba;
  accent: Rgba;
  extra: ReadonlyMap<DitherColor, Rgba>;
}

interface Scene {
  disc: Disc;
  view: View;
  light: Vec3;
  ocean: number;
  matrix: DitherMatrix;
  paint: Paint;
}

const put = (data: Uint8ClampedArray, index: number, [r, g, b, a]: Rgba) => {
  const at = index * 4;
  data[at] = r * 255;
  data[at + 1] = g * 255;
  data[at + 2] = b * 255;
  data[at + 3] = a * 255;
};

const surfaceTone = (scene: Scene, normal: Vec3) => {
  const { view, light, ocean } = scene;
  const lit =
    normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2];
  // Lambert light with a short soft edge past the terminator.
  const shade = Math.min(1, Math.max(0, (lit + 0.08) / 1.08));
  const [wx, wy, wz] = toWorld(view, normal);
  const lat = Math.asin(Math.max(-1, Math.min(1, wy))) / RADIANS;
  const lon = Math.atan2(wx, wz) / RADIANS;
  if (landCoverage(lat, lon) >= 0.5) {
    return 0.07 + 0.93 * shade;
  }
  const rim = (1 - normal[2]) ** 3;
  return shade * (ocean * (0.5 + rim) + rim * 0.1);
};

/** Land, sea and terminator: one dithered tone per pixel of the sphere. */
const paintSphere = (image: ImageData, scene: Scene) => {
  const { disc, matrix, paint } = scene;
  const { sphere, columns } = disc;
  for (let i = 0; i < sphere.length; i += 4) {
    const index = sphere[i] ?? 0;
    const tone = surfaceTone(scene, [
      sphere[i + 1] ?? 0,
      sphere[i + 2] ?? 0,
      sphere[i + 3] ?? 0,
    ]);
    const x = index % columns;
    if (tone > thresholdAt(matrix, x, (index - x) / columns)) {
      put(image.data, index, paint.land);
    }
  }
};

/** A thin glow around the sphere, strongest towards the light. */
const paintAtmosphere = (image: ImageData, scene: Scene) => {
  const { disc, light, matrix, paint } = scene;
  const { halo, columns, cx, cy, radius } = disc;
  for (let i = 0; i < halo.length; i += 2) {
    const index = halo[i] ?? 0;
    const x = index % columns;
    const y = (index - x) / columns;
    const nx = (x + 0.5 - cx) / radius;
    const ny = (cy - y - 0.5) / radius;
    const facing = Math.max(
      0,
      (nx * light[0] + ny * light[1]) / Math.hypot(nx, ny)
    );
    const tone = (halo[i + 1] ?? 0) ** 2 * (0.12 + 0.5 * facing);
    if (tone > thresholdAt(matrix, x, y)) {
      put(image.data, index, paint.land);
    }
  }
};

interface Projected {
  x: number;
  y: number;
  /** Depth towards the viewer, -1 to 1 on the surface. */
  z: number;
  /** In front of the globe, or beside it where the globe can't hide it. */
  visible: boolean;
}

const projectPoint = (disc: Disc, view: View, point: Vec3): Projected => {
  const [x, y, z] = toView(view, point);
  return {
    visible: z > 0 || x * x + y * y > 1,
    x: disc.cx + x * disc.radius,
    y: disc.cy - y * disc.radius,
    z,
  };
};

const rgba = (color: Rgba) =>
  `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${color[3]})`;

const fillCell = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 1
) => {
  const offset = Math.floor(size / 2);
  context.fillRect(Math.round(x) - offset, Math.round(y) - offset, size, size);
};

const PULSE = 2.6;

const paintMarker = (
  context: CanvasRenderingContext2D,
  scene: Scene,
  point: Projected,
  phase: number
) => {
  // An expanding ring of dithered cells that fades as it grows.
  const ring = 2 + phase * Math.max(6, scene.disc.radius * 0.1);
  const fade = (1 - phase) ** 1.5;
  const steps = Math.ceil(ring * 6);
  for (let s = 0; s < steps; s += 1) {
    const angle = (s / steps) * Math.PI * 2;
    const x = Math.round(point.x + Math.cos(angle) * ring);
    // Flattened by depth, so rings near the limb lie on the surface.
    const y = Math.round(point.y + Math.sin(angle) * ring * point.z);
    if (fade > thresholdAt(scene.matrix, x, y)) {
      fillCell(context, x, y);
    }
  }
  fillCell(context, point.x, point.y, 3);
};

const paintMarkers = (
  context: CanvasRenderingContext2D,
  scene: Scene,
  markers: readonly GlobeMarker[],
  time: number
) => {
  const { disc, view, paint } = scene;
  for (const [index, marker] of markers.entries()) {
    const point = projectPoint(disc, view, fromLatLon(marker.at));
    if (point.z > 0.05) {
      context.fillStyle = rgba(
        (marker.color && paint.extra.get(marker.color)) || paint.accent
      );
      paintMarker(context, scene, point, (time / PULSE + index * 0.37) % 1);
    }
  }
};

/** A point on the great circle from `a` to `b`, lifted in the middle. */
const arcPoint = (a: Vec3, b: Vec3, angle: number, s: number): Vec3 => {
  const sin = Math.sin(angle) || 1;
  const wa = Math.sin((1 - s) * angle) / sin;
  const wb = Math.sin(s * angle) / sin;
  const lift = 1 + Math.sin(Math.PI * s) * (0.06 + angle * 0.1);
  return [
    (a[0] * wa + b[0] * wb) * lift,
    (a[1] * wa + b[1] * wb) * lift,
    (a[2] * wa + b[2] * wb) * lift,
  ];
};

const paintArcs = (
  context: CanvasRenderingContext2D,
  scene: Scene,
  arcs: readonly GlobeArc[],
  time: number
) => {
  const { disc, view, paint } = scene;
  for (const [index, arc] of arcs.entries()) {
    const a = fromLatLon(arc.from);
    const b = fromLatLon(arc.to);
    const angle = Math.acos(
      Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])
    );
    context.fillStyle = rgba(
      (arc.color && paint.extra.get(arc.color)) || paint.accent
    );
    const steps = Math.max(12, Math.ceil(angle * disc.radius * 1.3));
    // A bright stretch travels along each arc; the rest is dotted.
    const head = (time / 3.2 + index * 0.41) % 1.5;
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const point = projectPoint(disc, view, arcPoint(a, b, angle, t));
      const lit = t <= head && t > head - 0.25;
      if (point.visible && (lit || s % 3 === 0)) {
        fillCell(context, point.x, point.y);
      }
    }
  }
};

interface CanvasSize {
  columns: number;
  rows: number;
}

const useCanvasSize = (
  wrapper: RefObject<HTMLDivElement | null>,
  cell: number
) => {
  const [size, setSize] = useState<CanvasSize | null>(null);
  useEffect(() => {
    const element = wrapper.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) {
        setSize({
          columns: Math.max(8, Math.floor(box.width / cell)),
          rows: Math.max(8, Math.floor(box.height / cell)),
        });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [wrapper, cell]);
  return size;
};

interface DragSpin {
  /** Extra spin in degrees from dragging, carried on with inertia after release. */
  advance: (delta: number) => number;
  handlers: Pick<
    ComponentProps<"div">,
    "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel"
  >;
}

const useDragSpin = (onDrag: () => void): DragSpin => {
  const offset = useRef(0);
  const velocity = useRef(0);
  const last = useRef<number | null>(null);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      last.current = event.clientX;
      velocity.current = 0;
    },
    []
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (last.current === null) {
        return;
      }
      const delta = (event.clientX - last.current) * 0.4;
      last.current = event.clientX;
      offset.current += delta;
      velocity.current = delta;
      onDrag();
    },
    [onDrag]
  );
  const onPointerUp = useCallback(() => {
    last.current = null;
  }, []);
  const advance = useCallback((delta: number) => {
    if (last.current === null && Math.abs(velocity.current) > 0.01) {
      offset.current += velocity.current * delta * 30;
      velocity.current *= Math.exp(-delta * 3);
    }
    return offset.current;
  }, []);
  return {
    advance,
    handlers: {
      onPointerCancel: onPointerUp,
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
};

const NO_MARKERS: readonly GlobeMarker[] = [];
const NO_ARCS: readonly GlobeArc[] = [];

/**
 * A rotating dithered globe: land from a built-in mask, a lit terminator
 * and a thin atmosphere, with optional pulsing markers and arcs between
 * places. Drawn on a small 2D canvas at dither-cell resolution, so it uses
 * no WebGL context. The globe stays round and centred in its box: size the
 * box with `className` (for example `aspect-square w-full`).
 */
export const DitherGlobe = ({
  color = "ink",
  accent = "orange",
  markers = NO_MARKERS,
  arcs = NO_ARCS,
  speed = 6,
  start = 10,
  tilt = 18,
  light = 300,
  ocean = 0.18,
  atmosphere = true,
  draggable = true,
  cell = 2,
  matrix = "bayer4",
  animate = true,
  className,
  ...props
}: DitherGlobeProps) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const cellSize = Math.max(1, cell);
  const size = useCanvasSize(wrapper, cellSize);
  const extraNames = [
    ...new Set([...markers, ...arcs].flatMap((item) => item.color ?? [])),
  ];
  const colors = useDitherColors(wrapper, [color, accent, ...extraNames]);
  const reducedMotion = usePrefersReducedMotion();
  const clock = useRef(0);
  const disc = useRef<Disc | null>(null);
  const drawRef = useRef<(time: number, delta: number) => void>(() => {
    // Replaced on the first render.
  });
  const drag = useDragSpin(
    useCallback(() => drawRef.current(clock.current, 0), [])
  );

  const draw = (time: number, delta: number) => {
    const context = canvas.current?.getContext("2d");
    const { current } = disc;
    if (!context || !current || !colors) {
      return;
    }
    clock.current = time;
    const spin = start + time * speed + drag.advance(delta);
    const extra = new Map(
      extraNames.map((name, index) => [name, colors[index + 2] ?? colors[1]])
    );
    const scene: Scene = {
      disc: current,
      light: lightVector(light),
      matrix,
      ocean,
      paint: { accent: colors[1], extra, land: colors[0] },
      view: { spin: spin * RADIANS, tilt: -tilt * RADIANS },
    };
    const image = context.createImageData(current.columns, current.rows);
    paintSphere(image, scene);
    if (atmosphere) {
      paintAtmosphere(image, scene);
    }
    context.putImageData(image, 0, 0);
    paintArcs(context, scene, arcs, time);
    paintMarkers(context, scene, markers, time);
  };
  useEffect(() => {
    drawRef.current = draw;
  });

  // Resize, and repaint whenever a prop or the theme changes, so a still
  // frame stays current too.
  useEffect(() => {
    const element = canvas.current;
    if (!element || !size) {
      return;
    }
    if (element.width !== size.columns || element.height !== size.rows) {
      element.width = size.columns;
      element.height = size.rows;
      disc.current = buildDisc(size.columns, size.rows);
    }
    drawRef.current(clock.current, 0);
  });

  useFrameLoop((time, delta) => drawRef.current(time, delta), {
    enabled: animate,
    target: wrapper,
  });

  const canDrag = draggable && !reducedMotion;
  return (
    <div
      ref={wrapper}
      aria-hidden
      className={cn(
        "relative overflow-hidden select-none",
        canDrag && "cursor-grab touch-pan-y active:cursor-grabbing",
        className
      )}
      {...(canDrag ? drag.handlers : {})}
      {...props}
    >
      <canvas
        ref={canvas}
        className="absolute top-1/2 left-1/2 -translate-1/2 [image-rendering:pixelated]"
        style={
          size
            ? { height: size.rows * cellSize, width: size.columns * cellSize }
            : undefined
        }
      />
    </div>
  );
};
