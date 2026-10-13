"use client";

import { useId, useRef, useState } from "react";
import type { ComponentProps, KeyboardEvent } from "react";

import { cssColor, ditherMaskStyle, MOTION } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** `none` means no data for the day, such as before the service existed. */
export type UptimeStatus = "up" | "degraded" | "down" | "none";

export interface UptimeDay {
  /** The day, as an ISO date: `"2026-10-13"`. */
  date: string;
  /** Share of the day the service was up, 0 to 1. `null` for no data. */
  uptime: number | null;
  /** Override the status worked out from `uptime`. */
  status?: UptimeStatus;
  /** A short incident note for the tooltip. */
  note?: string;
}

export type UptimeBarProps = Omit<ComponentProps<"div">, "children"> & {
  /** The service, such as `"API"`. */
  label: string;
  /** One entry per day, oldest first. The last 30, 60 or 90 show, depending on width. */
  days: readonly UptimeDay[];
  /** Colours per status. Default: ink for up, amber for degraded, `--destructive` for down. */
  colors?: Partial<Record<UptimeStatus, DitherColor>>;
  /** Locale for dates in the tooltip. Default `"en-US"`. */
  locale?: string;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size in CSS pixels. Default 2, so narrow bars still show a pattern. */
  cell?: number;
};

const DEFAULT_COLORS = {
  degraded: "--uptime-degraded",
  down: "--destructive",
  none: "--muted-foreground",
  up: "--dither-ink",
} as const satisfies Record<UptimeStatus, DitherColor>;

/** Density as well as colour tells the statuses apart. */
const LEVELS = {
  degraded: 7 / 16,
  down: 1,
  none: 3 / 16,
  up: 14 / 16,
} as const satisfies Record<UptimeStatus, number>;

const STATUS_TEXT = {
  degraded: "Degraded",
  down: "Outage",
  none: "No data",
  up: "Operational",
} as const satisfies Record<UptimeStatus, string>;

/** Up at 99.9% or more, degraded at 99% or more, else down. */
const statusOf = (day: UptimeDay): UptimeStatus => {
  if (day.status !== undefined) {
    return day.status;
  }
  if (day.uptime === null) {
    return "none";
  }
  if (day.uptime >= 0.999) {
    return "up";
  }
  return day.uptime >= 0.99 ? "degraded" : "down";
};

const TOOLTIP_WIDTH = 208;

const formatPercent = (value: number) =>
  `${(Math.floor(value * 10_000) / 100).toFixed(2)}%`;

/** Days shown at each width: 30 by default, 60 from 28rem, 90 from 42rem. */
const visibility = (fromEnd: number) => {
  if (fromEnd < 30) {
    return "";
  }
  return fromEnd < 60 ? "hidden @md:block" : "hidden @2xl:block";
};

/**
 * A status-page row: one dithered bar per day, coloured and dithered by
 * status, with the overall uptime. Hover, tap or arrow through the bars
 * for each day's details.
 */
export const UptimeBar = ({
  label,
  days,
  colors,
  locale = "en-US",
  matrix = "bayer4",
  cell = 2,
  className,
  ...props
}: UptimeBarProps) => {
  const tooltipId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [tip, setTip] = useState<{ index: number; left: number } | null>(null);
  const active = tip?.index ?? null;
  const [focusIndex, setFocusIndex] = useState(days.length - 1);

  const palette = { ...DEFAULT_COLORS, ...colors };
  const dates = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
  const recorded = days.flatMap(({ uptime }) =>
    uptime === null ? [] : [uptime]
  );
  const overall =
    recorded.length === 0
      ? null
      : recorded.reduce((sum, uptime) => sum + uptime, 0) / recorded.length;
  const latest = days.at(-1);
  const current = latest ? statusOf(latest) : "none";

  const describe = (day: UptimeDay) => {
    const status = statusOf(day);
    const parts = [
      dates.format(new Date(`${day.date}T00:00:00Z`)),
      STATUS_TEXT[status],
    ];
    if (day.uptime !== null) {
      parts.push(`${formatPercent(day.uptime)} uptime`);
    }
    if (day.note) {
      parts.push(day.note);
    }
    return parts.join(", ");
  };

  /** Point the tooltip at a bar, kept inside the row. */
  const show = (index: number) => {
    const button = buttons.current[index];
    const row = button?.closest("ol");
    if (!button || !row) {
      return;
    }
    const centre = button.offsetLeft + button.offsetWidth / 2;
    const half = TOOLTIP_WIDTH / 2;
    const left = Math.min(Math.max(centre, half), row.offsetWidth - half);
    setTip({ index, left });
  };
  const hide = () => setTip(null);

  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const shown = days
      .map((_, dayIndex) => dayIndex)
      .filter((dayIndex) => Boolean(buttons.current[dayIndex]?.offsetParent));
    const position = shown.indexOf(index);
    const targets: Record<string, number | undefined> = {
      ArrowLeft: shown[Math.max(0, position - 1)],
      ArrowRight: shown[Math.min(shown.length - 1, position + 1)],
      End: shown.at(-1),
      Home: shown[0],
    };
    const next = targets[event.key];
    if (next === undefined) {
      if (event.key === "Escape") {
        hide();
      }
      return;
    }
    event.preventDefault();
    setFocusIndex(next);
    buttons.current[next]?.focus();
  };

  const activeDay = active === null ? undefined : days[active];
  const spans = [30, 60, 90].map((span) => Math.min(span, days.length));

  return (
    <div
      className={cn(
        "@container relative flex w-full flex-col gap-3",
        "[--uptime-degraded:oklch(0.64_0.14_70)] dark:[--uptime-degraded:oklch(0.82_0.14_80)]",
        className
      )}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-foreground shrink-0 font-medium">{label}</span>
          <span
            className="min-w-0 truncate text-xs"
            style={{ color: cssColor(palette[current]) }}
          >
            {STATUS_TEXT[current]}
          </span>
        </div>
        {overall === null ? null : (
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {formatPercent(overall)} uptime
          </span>
        )}
      </div>
      <div className="relative">
        <ol
          aria-label={`${label}, daily uptime`}
          className="relative flex h-8 gap-[3px]"
          onPointerLeave={hide}
        >
          {days.map((day, index) => {
            const status = statusOf(day);
            const fromEnd = days.length - 1 - index;
            return (
              <li
                key={day.date}
                className={cn("h-full min-w-0 flex-1", visibility(fromEnd))}
              >
                <button
                  ref={(node) => {
                    buttons.current[index] = node;
                  }}
                  type="button"
                  tabIndex={index === focusIndex ? 0 : -1}
                  aria-label={describe(day)}
                  aria-describedby={active === index ? tooltipId : undefined}
                  onPointerEnter={() => show(index)}
                  onFocus={() => {
                    setFocusIndex(index);
                    show(index);
                  }}
                  onBlur={hide}
                  onClick={() => show(index)}
                  onKeyDown={(event) => moveFocus(event, index)}
                  className={cn(
                    "focus-visible:outline-ring block size-full cursor-default transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
                    active !== null && active !== index && "opacity-55"
                  )}
                  style={{
                    backgroundColor: cssColor(palette[status]),
                    transitionDuration: `${MOTION.fast}ms`,
                    ...ditherMaskStyle(LEVELS[status], { cell, matrix }),
                  }}
                />
              </li>
            );
          })}
        </ol>
        {activeDay && tip ? (
          <div
            id={tooltipId}
            role="tooltip"
            className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 rounded-lg border px-3 py-2.5 text-xs shadow-lg"
            style={{ left: tip.left, width: TOOLTIP_WIDTH }}
          >
            <div className="text-foreground font-medium">
              {dates.format(new Date(`${activeDay.date}T00:00:00Z`))}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0"
                style={{
                  backgroundColor: cssColor(palette[statusOf(activeDay)]),
                  ...ditherMaskStyle(LEVELS[statusOf(activeDay)], {
                    cell,
                    matrix,
                  }),
                }}
              />
              <span className="text-foreground">
                {STATUS_TEXT[statusOf(activeDay)]}
              </span>
              {activeDay.uptime === null ? null : (
                <span className="text-muted-foreground ml-auto font-mono tabular-nums">
                  {formatPercent(activeDay.uptime)}
                </span>
              )}
            </div>
            {activeDay.note ? (
              <p className="text-muted-foreground mt-1.5 leading-snug text-pretty">
                {activeDay.note}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        aria-hidden
        className="text-muted-foreground flex items-center gap-3 font-mono text-[0.6875rem]"
      >
        <span className="@md:hidden">{spans[0]} days ago</span>
        <span className="hidden @md:inline @2xl:hidden">
          {spans[1]} days ago
        </span>
        <span className="hidden @2xl:inline">{spans[2]} days ago</span>
        <span className="bg-border h-px flex-1" />
        <span>Today</span>
      </div>
    </div>
  );
};
