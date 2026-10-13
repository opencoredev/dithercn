"use client";

import { useId, useRef, useState } from "react";
import type { ComponentProps, CSSProperties, KeyboardEvent } from "react";

import { bloomStyle, cssColor, fillStyle, MOTION } from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
  FillVariant,
} from "@/lib/dither";
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
  /** Colours per status, as palette names or CSS colours. Default: green up, orange degraded, red down, grey for no data. */
  colors?: Partial<Record<UptimeStatus, DitherColor>>;
  /**
   * Texture of the up days. Default `gradient`: dense at the base, thinning
   * upward. Degraded days are always hatched, down days solid and days
   * without data dotted, so status never relies on colour alone.
   */
  fill?: FillVariant;
  /** Soft glow behind degraded and down days, so incidents stand out: `off`, `low` or `high`. Default `off`. */
  bloom?: Bloom;
  /** Locale for dates in the tooltip. Default `"en-US"`. */
  locale?: string;
  /** Gradient only: threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size in CSS pixels. Default 2, so narrow bars still show a pattern. */
  cell?: number;
};

const DEFAULT_COLORS = {
  degraded: "orange",
  down: "red",
  none: "grey",
  up: "green",
} as const satisfies Record<UptimeStatus, DitherColor>;

/** Texture as well as colour tells the statuses apart. */
const STATUS_FILLS = {
  degraded: "hatched",
  down: "solid",
  none: "dotted",
} as const satisfies Record<Exclude<UptimeStatus, "up">, FillVariant>;

/** Paint for one day's bar (or the tooltip's swatch). */
const statusStyle = ({
  status,
  color,
  fill,
  cell,
  matrix,
  bloom,
}: {
  status: UptimeStatus;
  color: DitherColor;
  fill: FillVariant;
  cell: number;
  matrix: DitherMatrix;
  bloom: Bloom;
}): CSSProperties => ({
  ...fillStyle(status === "up" ? fill : STATUS_FILLS[status], {
    cell,
    color,
    edge: "bottom",
    from: 1,
    length: 10,
    matrix,
    to: 8 / 16,
  }),
  ...(status === "degraded" || status === "down"
    ? bloomStyle(color, bloom)
    : {}),
});

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

const formatPercent = (value: number) =>
  `${(Math.floor(value * 10_000) / 100).toFixed(2)}%`;

const TOOLTIP_WIDTH = 208;

/** The tooltip's day and position. A hidden tip keeps its place so it fades out there. */
interface Tip {
  index: number;
  left: number;
  visible: boolean;
  /** Glide from the last bar (pointer) or jump (keyboard, first show). */
  glide: boolean;
}

/** Details for one day, gliding between bars by transform. */
const DayTooltip = ({
  id,
  tip,
  day,
  dates,
  paint,
}: {
  id: string;
  tip: Tip | null;
  day: UptimeDay | undefined;
  dates: Intl.DateTimeFormat;
  paint: (status: UptimeStatus) => CSSProperties;
}) => {
  const status = day === undefined ? "none" : statusOf(day);
  return (
    <div
      id={id}
      role="tooltip"
      data-glide={String(tip?.glide ?? false)}
      className="bg-popover/95 text-popover-foreground border-border pointer-events-none absolute bottom-full left-0 z-10 mb-2 rounded-lg border px-3 py-2.5 text-xs shadow-[0_8px_24px_-12px_rgb(0_0_0/0.6)] backdrop-blur-sm transition-[transform,opacity] duration-200 ease-(--ease-out) motion-reduce:transition-none data-[glide=false]:transition-[opacity]"
      style={{
        opacity: tip?.visible === true ? 1 : 0,
        transform: `translateX(${Math.round((tip?.left ?? 0) - TOOLTIP_WIDTH / 2)}px)`,
        visibility: tip === null ? "hidden" : undefined,
        width: TOOLTIP_WIDTH,
      }}
    >
      {day === undefined ? null : (
        <>
          <div className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
            {dates.format(new Date(`${day.date}T00:00:00Z`))}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0"
              style={paint(status)}
            />
            <span className="text-foreground">{STATUS_TEXT[status]}</span>
            {day.uptime === null ? null : (
              <span className="text-muted-foreground ml-auto font-mono tabular-nums">
                {formatPercent(day.uptime)}
              </span>
            )}
          </div>
          {day.note ? (
            <p className="text-muted-foreground mt-1.5 leading-snug text-pretty">
              {day.note}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};

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
  fill = "gradient",
  bloom = "off",
  locale = "en-US",
  matrix = "bayer4",
  cell = 2,
  className,
  ...props
}: UptimeBarProps) => {
  const tooltipId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [tip, setTip] = useState<Tip | null>(null);
  const active = tip?.visible === true ? tip.index : null;
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
    setTip((previous) => ({
      glide: previous?.visible === true,
      index,
      left,
      visible: true,
    }));
  };
  const hide = () =>
    setTip((previous) =>
      previous === null ? null : { ...previous, glide: false, visible: false }
    );

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

  const spans = [30, 60, 90].map((span) => Math.min(span, days.length));

  return (
    <div
      className={cn(
        "@container relative flex w-full flex-col gap-3",
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
                    ...statusStyle({
                      bloom,
                      cell,
                      color: palette[status],
                      fill,
                      matrix,
                      status,
                    }),
                  }}
                />
              </li>
            );
          })}
        </ol>
        <DayTooltip
          id={tooltipId}
          tip={tip}
          day={tip === null ? undefined : days[tip.index]}
          dates={dates}
          paint={(status) =>
            statusStyle({
              bloom: "off",
              cell,
              color: palette[status],
              fill,
              matrix,
              status,
            })
          }
        />
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
