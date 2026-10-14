"use client";

import Link from "next/link";
import type { ComponentType } from "react";

import AuroraBorealis from "@/examples/aurora-borealis";
import AvatarDemo from "@/examples/avatar-demo";
import BarChartDemo from "@/examples/bar-chart-demo";
import DitherButtonDemo from "@/examples/dither-button-demo";
import DitherGlobeDemo from "@/examples/dither-globe-demo";
import DitherImageDemo from "@/examples/dither-image-demo";
import DitherTextDemo from "@/examples/dither-text-demo";
import DonutChartDemo from "@/examples/donut-chart-demo";
import GaugeDemo from "@/examples/gauge-demo";
import HeatmapDemo from "@/examples/heatmap-demo";
import ProgressBarDemo from "@/examples/progress-bar-demo";
import StatCardDemo from "@/examples/stat-card-demo";
import WavesDemo from "@/examples/waves-demo";
import { useNearViewport } from "@/hooks/use-near-viewport";
import type { CatalogCategory } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * The landing's example wall: the same demos the docs pages open with,
 * live and at their default settings, so what you see is what installs.
 * Each demo mounts only as it nears the viewport, and WebGL ones share the
 * engine's context budget.
 */

interface Example {
  /** Docs URL of the component, which also finds its name and group. */
  url: string;
  Demo: ComponentType;
  /** `stretch` for full-bleed backgrounds, `center` for everything else. */
  align: "center" | "stretch";
  /** Grid span and stage height at each width. */
  span: string;
  stage: string;
  /** Leave off phones, where a long single column would bury the rest of the page. */
  wide?: boolean;
}

const EXAMPLES: readonly Example[] = [
  {
    Demo: AuroraBorealis,
    align: "stretch",
    span: "sm:col-span-2 lg:col-span-4 lg:row-span-2",
    stage: "h-80 sm:h-[420px] lg:h-auto lg:flex-1",
    url: "/docs/backgrounds/aurora",
  },
  {
    Demo: GaugeDemo,
    align: "center",
    span: "lg:col-span-2",
    stage: "h-80",
    url: "/docs/charts/gauge",
  },
  {
    Demo: StatCardDemo,
    align: "center",
    span: "lg:col-span-2",
    stage: "h-80",
    url: "/docs/charts/stat-card",
  },
  {
    Demo: BarChartDemo,
    align: "center",
    span: "sm:col-span-2 lg:col-span-3",
    stage: "h-[420px]",
    url: "/docs/charts/bar-chart",
  },
  {
    Demo: DitherTextDemo,
    align: "center",
    span: "sm:col-span-2 lg:col-span-3",
    stage: "h-[420px]",
    url: "/docs/text/dither-text",
  },
  {
    Demo: DitherGlobeDemo,
    align: "stretch",
    span: "lg:col-span-2",
    stage: "h-[420px]",
    url: "/docs/backgrounds/dither-globe",
  },
  {
    Demo: DonutChartDemo,
    align: "center",
    span: "lg:col-span-2",
    stage: "h-[420px]",
    url: "/docs/charts/donut-chart",
    wide: true,
  },
  {
    Demo: AvatarDemo,
    align: "center",
    span: "lg:col-span-2",
    stage: "h-[420px]",
    url: "/docs/interface/avatar",
    wide: true,
  },
  {
    Demo: DitherImageDemo,
    align: "center",
    span: "sm:col-span-2 lg:col-span-3",
    stage: "h-[440px]",
    url: "/docs/images/dither-image",
  },
  {
    Demo: WavesDemo,
    align: "stretch",
    span: "sm:col-span-2 lg:col-span-3",
    stage: "h-[440px]",
    url: "/docs/backgrounds/waves",
    wide: true,
  },
  {
    Demo: HeatmapDemo,
    align: "center",
    span: "lg:col-span-2",
    stage: "h-72",
    url: "/docs/charts/heatmap",
    wide: true,
  },
  {
    Demo: ProgressBarDemo,
    align: "center",
    span: "lg:col-span-2",
    stage: "h-72",
    url: "/docs/charts/progress-bar",
  },
  {
    Demo: DitherButtonDemo,
    align: "center",
    span: "lg:col-span-2",
    stage: "h-72",
    url: "/docs/interface/dither-button",
    wide: true,
  },
];

const ALIGN_CLASS = {
  center:
    "flex items-center-safe justify-center-safe p-6 sm:p-8 *:max-w-full *:min-w-0",
  stretch: "grid *:min-h-0 *:min-w-0",
} as const satisfies Record<Example["align"], string>;

const findPiece = (catalog: CatalogCategory[], url: string) => {
  for (const category of catalog) {
    const piece = category.pieces.find((item) => item.url === url);
    if (piece) {
      return { category: category.name, name: piece.name };
    }
  }
  return null;
};

const Tile = ({
  example,
  name,
  category,
}: {
  example: Example;
  name: string;
  category: string;
}) => {
  const { isNear, ref } = useNearViewport();
  const { Demo } = example;

  return (
    <li
      className={cn(
        "flex flex-col overflow-hidden rounded-[24px] border",
        example.span,
        example.wide && "max-sm:hidden"
      )}
    >
      <div
        ref={ref}
        className={cn(
          "bg-card text-card-foreground relative isolate w-full min-w-0 overflow-hidden [--dither-paper:var(--card)] supports-[overflow:clip]:overflow-clip",
          ALIGN_CLASS[example.align],
          example.stage
        )}
      >
        {isNear ? <Demo /> : null}
      </div>
      <Link
        href={example.url}
        transitionTypes={["nav-forward"]}
        className="hover:bg-muted/40 focus-visible:ring-ring/60 flex items-baseline justify-between gap-3 border-t px-5 py-4 transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <span className="font-medium tracking-[-0.01em]">{name}</span>
        <span className="text-muted-foreground text-sm">{category}</span>
      </Link>
    </li>
  );
};

export const ExampleGallery = ({
  catalog,
  className,
}: {
  catalog: CatalogCategory[];
  className?: string;
}) => (
  <ul
    className={cn(
      "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6",
      className
    )}
  >
    {EXAMPLES.map((example) => {
      const piece = findPiece(catalog, example.url);
      return piece ? (
        <Tile
          key={example.url}
          example={example}
          name={piece.name}
          category={piece.category}
        />
      ) : null;
    })}
  </ul>
);
