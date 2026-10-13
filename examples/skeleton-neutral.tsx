import { Skeleton } from "@/components/dithercn/skeleton";

export default function SkeletonNeutral() {
  return (
    <div
      aria-busy="true"
      className="grid w-full max-w-lg gap-4 [--dither-cell:2px] sm:grid-cols-2"
    >
      <span className="sr-only">Loading articles</span>
      {[0, 1].map((card) => (
        <div
          key={card}
          className="bg-background flex flex-col gap-4 rounded-2xl border p-4"
        >
          <Skeleton
            color="--foreground"
            className="aspect-[4/3] w-full rounded-lg"
            delay={card * 0.2}
          />
          <Skeleton
            color="--foreground"
            shape="text"
            lines={2}
            delay={card * 0.2 + 0.1}
          />
        </div>
      ))}
    </div>
  );
}
