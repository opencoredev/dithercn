"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, CSSProperties, RefObject } from "react";

import { DitheredLogo } from "@/components/dithercn/dithered-logo";
import type { DitheredLogoProps } from "@/components/dithercn/dithered-logo";
import { ditherRamp, useInView, usePrefersReducedMotion } from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface MarqueeLogo {
  src: string;
  /** The brand name, read out by screen readers. */
  alt: string;
  /** Width over height. Set it to reserve space before the logo loads. */
  ratio?: number;
  /** Makes the logo a link. */
  href?: string;
  /** This logo's ink, overriding `color`. */
  color?: DitheredLogoProps["color"];
}

/** How the ends of the row meet the page. */
export type MarqueeFade = "soft" | "dither" | "none";

interface MarqueeLayout {
  /** A single row that scrolls sideways. */
  variant?: "marquee";
  /** Scroll speed in CSS pixels per second. Default 32. */
  speed?: number;
  /** Which way the row moves. Default `"left"`. */
  direction?: "left" | "right";
  /**
   * How the ends fade out: a smooth mask, a dithered one, or a hard edge.
   * Both masks work on any background. Default `"soft"`.
   */
  fade?: MarqueeFade;
  /** Width of each end's fade in CSS pixels. Default 96. */
  fadeWidth?: number;
  /**
   * A small pause button that appears on hover and keyboard focus, so
   * anyone can stop the motion. Default `true`.
   */
  pauseButton?: boolean;
}

interface WallLayout {
  /** A still grid of logos with hairline dividers. */
  variant: "wall";
  speed?: never;
  direction?: never;
  fade?: never;
  fadeWidth?: never;
  pauseButton?: never;
}

export type LogoLayout = MarqueeLayout | WallLayout;

export type LogoMarqueeProps = Omit<ComponentProps<"div">, "children"> &
  LogoLayout &
  Pick<
    DitheredLogoProps,
    | "color"
    | "tone"
    | "fill"
    | "outline"
    | "floor"
    | "matrix"
    | "cell"
    | "effect"
    | "period"
  > & {
    /** The logos, in order. */
    logos: readonly MarqueeLogo[];
    /** Names the list for screen readers. Default `"Logos"`. */
    label?: string;
    /** Logo height in CSS pixels. Default 28. */
    logoHeight?: number;
    /** Space between logos in the row, in CSS pixels. Default 64. */
    gap?: number;
  };

// Enough to fill a very wide screen with a short row of logos.
const MAX_COPIES = 8;
// Seconds for the row to coast to a stop or back up to speed.
const EASE_SECONDS = 0.45;
// Cell of the dithered fade, in CSS pixels.
const FADE_CELL = 3;

/**
 * A mask for both ends of the row: transparent at the edges, opaque
 * between. `dither` steps through Bayer levels instead of a smooth ramp.
 */
const fadeMask = (fade: MarqueeFade, width: number): CSSProperties => {
  if (fade === "none") {
    return {};
  }
  if (fade === "soft") {
    const image = `linear-gradient(to right, transparent, #000 ${width}px, #000 calc(100% - ${width}px), transparent)`;
    return { WebkitMaskImage: image, maskImage: image };
  }
  const length = Math.max(4, Math.round(width / FADE_CELL));
  const tile = (edge: "left" | "right") => {
    const ramp = ditherRamp({ edge, from: 1, length, to: 0 });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ramp.width} ${ramp.height}" shape-rendering="crispEdges"><path d="${ramp.path}"/></svg>`;
    return {
      image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      size: `${ramp.width * FADE_CELL}px ${ramp.height * FADE_CELL}px`,
    };
  };
  // Dense towards the middle: the left tile is densest on its right.
  const left = tile("right");
  const right = tile("left");
  const span = Number.parseFloat(left.size);
  const image = `${left.image}, ${right.image}, linear-gradient(#000, #000)`;
  const size = `${left.size}, ${right.size}, calc(100% - ${span * 2}px) 100%`;
  const position = "left top, right top, center";
  const repeat = "repeat-y, repeat-y, no-repeat";
  return {
    WebkitMaskImage: image,
    WebkitMaskPosition: position,
    WebkitMaskRepeat: repeat,
    WebkitMaskSize: size,
    maskImage: image,
    maskPosition: position,
    maskRepeat: repeat,
    maskSize: size,
  };
};

/** One logo, wrapped in a link when it has one. */
const LogoItem = ({
  logo,
  height,
  hidden,
  phase,
  logoProps,
}: {
  logo: MarqueeLogo;
  height: number;
  hidden: boolean;
  phase: number;
  logoProps: Omit<DitheredLogoProps, "src" | "alt">;
}) => {
  const mark = (
    <DitheredLogo
      {...logoProps}
      color={logo.color ?? logoProps.color}
      phase={phase}
      lazy={false}
      src={logo.src}
      alt={hidden || logo.href ? "" : logo.alt}
      ratio={logo.ratio}
      className="max-w-full"
      style={{ height }}
    />
  );
  if (!logo.href) {
    return mark;
  }
  return (
    <a
      href={logo.href}
      aria-label={logo.alt}
      tabIndex={hidden ? -1 : undefined}
      className="focus-visible:ring-ring flex max-w-full rounded-sm opacity-80 outline-none transition-opacity duration-150 ease-(--ease-out) hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
    >
      {mark}
    </a>
  );
};

/** Measures one copy of the row and the visible width. */
const useRowSize = (
  moving: boolean,
  rootRef: RefObject<HTMLElement | null>,
  groupRef: RefObject<HTMLElement | null>
) => {
  const [size, setSize] = useState({ group: 0, root: 0 });
  useEffect(() => {
    const root = rootRef.current;
    const group = groupRef.current;
    if (!(moving && root && group)) {
      return;
    }
    const measure = () => {
      const next = {
        group: group.getBoundingClientRect().width,
        root: root.getBoundingClientRect().width,
      };
      setSize((current) =>
        current.group === next.group && current.root === next.root
          ? current
          : next
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(group);
    return () => observer.disconnect();
  }, [moving, rootRef, groupRef]);
  return size;
};

/**
 * Runs the row as a looping Web Animation and eases its playback rate
 * towards 0 while held and back to 1 when let go, so it coasts instead of
 * stopping dead.
 */
const useCoasting = ({
  trackRef,
  distance,
  speed,
  reverse,
  held,
  enabled,
}: {
  trackRef: RefObject<HTMLElement | null>;
  distance: number;
  speed: number;
  reverse: boolean;
  held: boolean;
  enabled: boolean;
}) => {
  const animationRef = useRef<Animation | null>(null);
  const heldRef = useRef(held);

  useEffect(() => {
    const track = trackRef.current;
    if (!(enabled && track && distance > 0 && speed > 0)) {
      return;
    }
    const far = `translateX(${-distance}px)`;
    const near = "translateX(0)";
    const animation = track.animate(
      [
        { transform: reverse ? far : near },
        { transform: reverse ? near : far },
      ],
      {
        duration: (distance / speed) * 1000,
        easing: "linear",
        iterations: Number.POSITIVE_INFINITY,
      }
    );
    animation.playbackRate = heldRef.current ? 0 : 1;
    animationRef.current = animation;
    return () => {
      animation.cancel();
      animationRef.current = null;
    };
  }, [enabled, trackRef, distance, speed, reverse]);

  useEffect(() => {
    heldRef.current = held;
    const animation = animationRef.current;
    if (!animation) {
      return;
    }
    const target = held ? 0 : 1;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const rate = animation.playbackRate;
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      const next =
        rate + (target - rate) * Math.min(1, (delta / EASE_SECONDS) * 4);
      animation.playbackRate = Math.abs(next - target) < 0.01 ? target : next;
      if (animation.playbackRate !== target) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [held]);
};

const PauseButton = ({
  paused,
  onToggle,
}: {
  paused: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    aria-pressed={paused}
    aria-label={paused ? "Play logos" : "Pause logos"}
    onClick={onToggle}
    className="bg-background/80 text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border opacity-0 backdrop-blur-sm transition-opacity duration-150 ease-(--ease-out) outline-none group-hover/marquee:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 data-[paused=true]:opacity-100 motion-reduce:transition-none"
    data-paused={paused}
  >
    <svg
      aria-hidden
      viewBox="0 0 8 8"
      className="size-2.5"
      shapeRendering="crispEdges"
    >
      <path
        d={
          paused
            ? "M1 0h2v8h-2zM3 1h2v6h-2zM5 2h2v4h-2zM7 3h1v2h-1z"
            : "M1 0h2v8h-2zM5 0h2v8h-2z"
        }
        fill="currentColor"
      />
    </svg>
  </button>
);

const StillRow = ({
  logos,
  label,
  gap,
  logoHeight,
  logoProps,
  className,
  rootRef,
  rest,
}: {
  logos: readonly MarqueeLogo[];
  label: string;
  gap: number;
  logoHeight: number;
  logoProps: Omit<DitheredLogoProps, "src" | "alt">;
  className: string | undefined;
  rootRef: RefObject<HTMLDivElement | null>;
  rest: ComponentProps<"div">;
}) => (
  <div {...rest} ref={rootRef} className={cn("w-full", className)}>
    <ul
      aria-label={label}
      className="flex flex-wrap items-center justify-center"
      style={{ columnGap: gap, rowGap: gap / 2 }}
    >
      {logos.map((logo, index) => (
        <li key={logo.src}>
          <LogoItem
            logo={logo}
            height={logoHeight}
            hidden={false}
            phase={index / Math.max(1, logos.length)}
            logoProps={logoProps}
          />
        </li>
      ))}
    </ul>
  </div>
);

const Wall = ({
  logos,
  label,
  logoHeight,
  logoProps,
  className,
  rootRef,
  rest,
}: {
  logos: readonly MarqueeLogo[];
  label: string;
  logoHeight: number;
  logoProps: Omit<DitheredLogoProps, "src" | "alt">;
  className: string | undefined;
  rootRef: RefObject<HTMLDivElement | null>;
  rest: ComponentProps<"div">;
}) => (
  <div {...rest} ref={rootRef} className={cn("@container w-full", className)}>
    <ul
      aria-label={label}
      className="grid grid-cols-2 border-t border-l @2xl:grid-cols-4"
    >
      {logos.map((logo, index) => (
        <li
          key={logo.src}
          className="flex min-w-0 items-center justify-center border-r border-b px-4 py-9 sm:px-6"
        >
          <LogoItem
            logo={logo}
            height={logoHeight}
            hidden={false}
            phase={index / Math.max(1, logos.length)}
            logoProps={logoProps}
          />
        </li>
      ))}
    </ul>
  </div>
);

/**
 * A row or wall of logos in one consistent dithered treatment. The row
 * loops seamlessly, coasts to a stop on hover and focus, pauses offscreen,
 * and holds still as a centred, wrapping row under reduced motion.
 */
export const LogoMarquee = (props: LogoMarqueeProps) => {
  const {
    logos,
    label = "Logos",
    logoHeight = 28,
    gap = 64,
    color,
    tone,
    fill,
    outline,
    floor,
    matrix,
    cell,
    effect,
    period,
    variant: _variant,
    speed: _speed,
    direction: _direction,
    fade: _fade,
    fadeWidth: _fadeWidth,
    pauseButton: _pauseButton,
    className,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...rest
  } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLUListElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const inView = useInView(rootRef);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);

  const isWall = props.variant === "wall";
  const layout: MarqueeLayout = props.variant === "wall" ? {} : props;
  const moving = !(isWall || reducedMotion);
  const size = useRowSize(moving, rootRef, groupRef);
  const logoProps = {
    cell,
    color,
    effect,
    fill,
    floor,
    matrix,
    outline,
    period,
    tone,
  };

  useCoasting({
    distance: size.group,
    enabled: moving,
    held: hovered || focused || paused || !inView,
    reverse: layout.direction === "right",
    speed: layout.speed ?? 32,
    trackRef,
  });

  if (isWall) {
    return (
      <Wall
        logos={logos}
        label={label}
        logoHeight={logoHeight}
        logoProps={logoProps}
        className={className}
        rootRef={rootRef}
        rest={rest}
      />
    );
  }
  if (!moving) {
    return (
      <StillRow
        logos={logos}
        label={label}
        gap={gap}
        logoHeight={logoHeight}
        logoProps={logoProps}
        className={className}
        rootRef={rootRef}
        rest={rest}
      />
    );
  }

  const copies =
    size.group > 0
      ? Math.min(MAX_COPIES, Math.max(2, Math.ceil(size.root / size.group) + 1))
      : 2;

  return (
    <div
      {...rest}
      ref={rootRef}
      data-paused={paused || undefined}
      className={cn("group/marquee relative w-full", className)}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (event.pointerType !== "touch") {
          setHovered(true);
        }
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setHovered(false);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setFocused(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      {/* Inline-size containment: the row's width must never feed back
          into the box that decides how many copies it needs. */}
      <div
        className="overflow-hidden py-2 [contain:inline-size]"
        style={fadeMask(layout.fade ?? "soft", layout.fadeWidth ?? 96)}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {Array.from({ length: copies }, (_, copy) => (
            <ul
              key={copy}
              ref={copy === 0 ? groupRef : undefined}
              aria-label={copy === 0 ? label : undefined}
              aria-hidden={copy === 0 ? undefined : true}
              className="flex shrink-0 items-center"
              style={{ columnGap: gap, paddingRight: gap }}
            >
              {logos.map((logo, index) => (
                <li key={logo.src} className="flex shrink-0 items-center">
                  <LogoItem
                    logo={logo}
                    height={logoHeight}
                    hidden={copy !== 0}
                    phase={index / Math.max(1, logos.length)}
                    logoProps={logoProps}
                  />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      {(layout.pauseButton ?? true) && (
        <PauseButton
          paused={paused}
          onToggle={() => setPaused((value) => !value)}
        />
      )}
    </div>
  );
};
