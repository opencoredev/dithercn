"use client";

import { useEffect, useState } from "react";

import { DitherNumber } from "@/components/dithercn/dither-number";
import { cssColor, fillStyle } from "@/lib/dither";

interface Kpi {
  label: string;
  value: number;
  previous: number;
  format: Intl.NumberFormatOptions;
  suffix?: string;
  /** Lower is better, as for latency. */
  invert?: boolean;
  /** Share of the target reached, for the meter. */
  target: number;
}

const START: Kpi[] = [
  {
    format: { currency: "USD", maximumFractionDigits: 0, style: "currency" },
    label: "Revenue today",
    previous: 48_120,
    target: 60_000,
    value: 48_120,
  },
  {
    format: { maximumFractionDigits: 1, notation: "compact" },
    label: "Active users",
    previous: 18_420,
    target: 24_000,
    value: 18_420,
  },
  {
    format: { maximumFractionDigits: 0 },
    invert: true,
    label: "p95 latency",
    previous: 182,
    suffix: " ms",
    target: 300,
    value: 182,
  },
  {
    format: {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "percent",
    },
    label: "Conversion",
    previous: 0.0412,
    target: 0.06,
    value: 0.0412,
  },
];

const STEPS = [740, 260, 14, 0.0011];

const tick = (kpis: Kpi[]) =>
  kpis.map((kpi, index) => {
    const step = (STEPS[index] ?? 1) * (Math.random() * 1.6 - 0.45);
    const raw = Math.max(0, kpi.value + step);
    const value =
      index === 3 ? Math.round(raw * 10_000) / 10_000 : Math.round(raw);
    return { ...kpi, previous: kpi.value, value };
  });

const Delta = ({ kpi }: { kpi: Kpi }) => {
  const change =
    kpi.previous === 0 ? 0 : (kpi.value - kpi.previous) / kpi.previous;
  const good = kpi.invert ? change <= 0 : change >= 0;
  const color = good ? "green" : "red";
  return (
    <span
      className="font-mono text-[11px] tabular-nums transition-colors duration-500"
      style={{ color: cssColor(color) }}
    >
      {change >= 0 ? "▲" : "▼"} {Math.abs(change * 100).toFixed(1)}%
    </span>
  );
};

export default function DitherNumberKpis() {
  const [kpis, setKpis] = useState(START);

  useEffect(() => {
    const timer = setInterval(() => setKpis(tick), 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <dl className="grid w-full max-w-xl grid-cols-1 gap-2 px-4 sm:grid-cols-2">
      {kpis.map((kpi, index) => (
        <div
          key={kpi.label}
          className="bg-background flex flex-col gap-3 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground text-xs">{kpi.label}</dt>
            <Delta kpi={kpi} />
          </div>
          <dd>
            <DitherNumber
              value={kpi.value}
              from={START[index]?.value ?? 0}
              format={kpi.format}
              locales="en-US"
              suffix={kpi.suffix}
              affixClassName="text-muted-foreground text-base font-normal tracking-normal"
              effect={index % 2 === 0 ? "resolve" : "roll"}
              accent={index === 2 ? "orange" : "ink"}
              size="md"
            />
          </dd>
          <div
            aria-hidden="true"
            className="bg-muted relative h-1.5 overflow-hidden rounded-[2px]"
          >
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-(--ease-out)"
              style={{
                ...fillStyle("gradient", {
                  cell: 1.5,
                  color: index === 2 ? "orange" : "ink",
                  edge: "right",
                  length: 40,
                  to: 0.25,
                }),
                width: `${Math.min(100, (kpi.value / kpi.target) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </dl>
  );
}
