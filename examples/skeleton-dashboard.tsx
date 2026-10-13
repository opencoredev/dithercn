import { Skeleton } from "@/components/dithercn/skeleton";

const TILES = ["Revenue", "Active users", "Churn"] as const;

export default function SkeletonDashboard() {
  return (
    <div aria-busy="true" className="flex w-full max-w-xl flex-col gap-3">
      <span className="sr-only">Loading dashboard</span>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TILES.map((title, index) => (
          <div
            key={title}
            className="bg-background ring-border flex flex-col gap-3 rounded-xl p-4 ring-1"
          >
            {/* Real labels stay; only the numbers are still loading. */}
            <span className="text-muted-foreground text-xs">{title}</span>
            <Skeleton
              color="ink"
              className="h-7 w-24 rounded-[4px]"
              delay={index * 0.1}
            />
            <Skeleton
              className="h-2.5 w-16 rounded-[3px]"
              delay={index * 0.1 + 0.05}
            />
          </div>
        ))}
      </div>
      <div className="bg-background ring-border flex flex-col gap-4 rounded-xl p-4 ring-1">
        <span className="text-muted-foreground text-xs">
          Requests, last 30 days
        </span>
        <Skeleton
          color="ink"
          fill="gradient"
          className="h-36 w-full rounded-lg"
          delay={0.3}
        />
      </div>
    </div>
  );
}
