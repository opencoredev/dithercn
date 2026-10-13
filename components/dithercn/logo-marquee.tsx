"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { DitheredLogo } from "@/components/dithercn/dithered-logo";
import type { DitheredLogoProps } from "@/components/dithercn/dithered-logo";
import {
  cssColor,
  ditherMaskStyle,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherColor } from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface MarqueeLogo {
  src: string;
  /** The brand name, read out by screen readers. */
  alt: string;
  /** Width over height. Set it to reserve space before the logo loads. */
  ratio?: number;
}

interface MarqueeLayout {
  /** A single row that scrolls sideways. */
  variant?: "marquee";
  /** Scroll speed in CSS pixels per second. Default 36. */
  speed?: number;
  /** Which way the row moves. Default `"left"`. */
  direction?: "left" | "right";
  /** Fade the row into the background at both ends. Default `true`. */
  fade?: boolean;
}

interface WallLayout {
  /** A still grid of logos with hairline dividers. */
  variant: "wall";
  speed?: never;
  direction?: never;
  fade?: never;
}

export type LogoLayout = MarqueeLayout | WallLayout;

export type LogoMarqueeProps = Omit<ComponentProps<"div">, "children"> &
  LogoLayout &
  Pick<DitheredLogoProps, "color" | "matrix" | "cell" | "shade" | "shimmer"> & {
    /** The logos, in order. */
    logos: readonly MarqueeLogo[];
    /** Names the list for screen readers. Default `"Logos"`. */
    label?: string;
    /** Logo height in CSS pixels. Default 28. */
    logoHeight?: number;
    /** Space between logos in the row, in CSS pixels. Default 64. */
    gap?: number;
    /**
     * The colour behind the row, which the ends fade into. Default
     * `"--dither-paper"`.
     */
    fadeColor?: DitherColor;
  };

// The ends fade over this many bands, each one Bayer tile wide.
const FADE_BANDS = 8;
const FADE_CELL = 3;

// Enough to fill a very wide screen with a short row of logos.
const MAX_COPIES = 8;

const DitheredFade = ({
  color,
  side,
}: {
  color: DitherColor;
  side: "left" | "right";
}) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute inset-y-0 z-10 flex",
      side === "left" ? "left-0" : "right-0 flex-row-reverse"
    )}
  >
    {Array.from({ length: FADE_BANDS }, (_, band) => (
      <div
        key={band}
        className="h-full shrink-0"
        style={{
          backgroundColor: cssColor(color),
          width: FADE_CELL * 4,
          ...ditherMaskStyle(1 - (band + 0.5) / FADE_BANDS, {
            cell: FADE_CELL,
          }),
        }}
      />
    ))}
  </div>
);

/**
 * A row or wall of logos in one consistent dithered ink. The row scrolls
 * seamlessly, pauses on hover and focus and when offscreen, and holds
 * still as a centred, wrapping row under reduced motion.
 */
export const LogoMarquee = (props: LogoMarqueeProps) => {
  const {
    logos,
    label = "Logos",
    logoHeight = 28,
    gap = 64,
    fadeColor = "--dither-paper",
    color,
    matrix,
    cell,
    shade,
    shimmer,
    variant: _variant,
    speed: _speed,
    direction: _direction,
    fade: _fade,
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
  const [size, setSize] = useState({ group: 0, root: 0 });

  const isWall = props.variant === "wall";
  const speed = props.variant === "wall" ? 0 : (props.speed ?? 36);
  const reverse = props.variant !== "wall" && props.direction === "right";
  const fade = props.variant !== "wall" && (props.fade ?? true);
  const moving = !(isWall || reducedMotion);

  const logoProps = { cell, color, matrix, shade, shimmer };
  const phaseOf = (index: number) => index / Math.max(1, logos.length);

  // Measure one set of logos and the visible width, to know how many
  // copies fill the row and how far one loop travels.
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
  }, [moving]);

  const copies =
    size.group > 0
      ? Math.min(MAX_COPIES, Math.max(2, Math.ceil(size.root / size.group) + 1))
      : 2;

  const animationRef = useRef<Animation | null>(null);
  useEffect(() => {
    const track = trackRef.current;
    if (!(moving && track && size.group > 0 && speed > 0)) {
      return;
    }
    const distance = `${-size.group}px`;
    const animation = track.animate(
      reverse
        ? [
            { transform: `translateX(${distance})` },
            { transform: "translateX(0)" },
          ]
        : [
            { transform: "translateX(0)" },
            { transform: `translateX(${distance})` },
          ],
      {
        duration: (size.group / speed) * 1000,
        easing: "linear",
        iterations: Number.POSITIVE_INFINITY,
      }
    );
    animationRef.current = animation;
    return () => {
      animation.cancel();
      animationRef.current = null;
    };
  }, [moving, size.group, speed, reverse]);

  const paused = hovered || focused || !inView;
  useEffect(() => {
    const animation = animationRef.current;
    if (!animation) {
      return;
    }
    if (paused) {
      animation.pause();
    } else {
      animation.play();
    }
  }, [paused, size.group, speed, reverse]);

  if (isWall) {
    return (
      <div
        {...rest}
        ref={rootRef}
        className={cn("@container w-full", className)}
      >
        <ul
          aria-label={label}
          className="grid grid-cols-2 border-t border-l @md:grid-cols-3 @2xl:grid-cols-4"
        >
          {logos.map((logo, index) => (
            <li
              key={logo.src}
              className="flex items-center justify-center border-r border-b px-6 py-9"
            >
              <DitheredLogo
                {...logoProps}
                src={logo.src}
                alt={logo.alt}
                ratio={logo.ratio}
                phase={phaseOf(index)}
                className="max-w-full"
                style={{ height: logoHeight }}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!moving) {
    return (
      <div {...rest} ref={rootRef} className={cn("w-full", className)}>
        <ul
          aria-label={label}
          className="flex flex-wrap items-center justify-center"
          style={{ columnGap: gap, rowGap: gap / 2 }}
        >
          {logos.map((logo, index) => (
            <li key={logo.src}>
              <DitheredLogo
                {...logoProps}
                phase={phaseOf(index)}
                src={logo.src}
                alt={logo.alt}
                ratio={logo.ratio}
                style={{ height: logoHeight }}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      {...rest}
      ref={rootRef}
      data-paused={paused || undefined}
      // Inline-size containment: the row's width must never feed back
      // into the box that decides how many copies it needs.
      className={cn(
        "relative w-full overflow-hidden [contain:inline-size]",
        className
      )}
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
                <DitheredLogo
                  {...logoProps}
                  phase={phaseOf(index)}
                  src={logo.src}
                  alt={copy === 0 ? logo.alt : ""}
                  ratio={logo.ratio}
                  style={{ height: logoHeight }}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
      {fade && <DitheredFade color={fadeColor} side="left" />}
      {fade && <DitheredFade color={fadeColor} side="right" />}
    </div>
  );
};
