"use client";

import {
  DitherTabs,
  DitherTabsContent,
  DitherTabsList,
  DitherTabsTrigger,
} from "@/components/dithercn/dither-tabs";
import { Sparkline } from "@/components/dithercn/sparkline";

const SECTIONS = [
  {
    data: [612, 640, 598, 705, 760, 731, 802, 846, 829, 901, 958, 1012],
    delta: "+18% on last week",
    label: "Traffic",
    unit: "requests per minute",
    value: "1,012",
  },
  {
    data: [14, 11, 12, 9, 22, 31, 18, 12, 9, 8, 7, 6],
    delta: "Back to normal after 14:20",
    label: "Errors",
    unit: "5xx per hour",
    value: "6",
  },
  {
    data: [182, 176, 190, 185, 171, 168, 175, 162, 158, 161, 155, 149],
    delta: "−33 ms since the cache change",
    label: "Latency",
    unit: "p95 in ms",
    value: "149",
  },
] as const;

export default function DitherTabsDashboard() {
  return (
    <div className="bg-background w-full max-w-xl rounded-2xl border px-5 pt-3 pb-5 [--dither-paper:var(--background)]">
      <DitherTabs defaultValue="Traffic" variant="underline" color="blue">
        <DitherTabsList aria-label="Metric" className="w-full">
          {SECTIONS.map((section) => (
            <DitherTabsTrigger key={section.label} value={section.label}>
              {section.label}
            </DitherTabsTrigger>
          ))}
        </DitherTabsList>
        {SECTIONS.map((section) => (
          <DitherTabsContent
            key={section.label}
            value={section.label}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">
                {section.unit}
              </span>
              <span className="text-3xl font-semibold tracking-tight">
                {section.value}
              </span>
              <span className="text-muted-foreground text-sm">
                {section.delta}
              </span>
            </div>
            <Sparkline
              data={section.data}
              label={`${section.label}, last 12 hours`}
              color="blue"
              height={64}
            />
          </DitherTabsContent>
        ))}
      </DitherTabs>
    </div>
  );
}
