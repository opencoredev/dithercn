import { Skeleton } from "@/components/dithercn/skeleton";

const ROWS = [0, 1, 2, 3, 4];

export default function SkeletonTable() {
  return (
    <div
      aria-busy="true"
      className="bg-background ring-border w-full max-w-xl overflow-hidden rounded-xl ring-1"
    >
      <span className="sr-only">Loading members</span>
      <div className="text-muted-foreground grid grid-cols-[1fr_6rem_5rem] gap-4 border-b px-5 py-3 text-xs font-medium">
        <span>Member</span>
        <span>Role</span>
        <span className="text-right">Last seen</span>
      </div>
      {ROWS.map((row) => (
        <div
          key={row}
          className="grid grid-cols-[1fr_6rem_5rem] items-center gap-4 border-b px-5 py-3.5 last:border-b-0"
        >
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" size={28} delay={row * 0.12} />
            <Skeleton
              className="h-3"
              style={{ width: `${48 + ((row * 17) % 30)}%` }}
              delay={row * 0.12}
            />
          </div>
          <Skeleton className="h-3 w-14" delay={row * 0.12 + 0.06} />
          <Skeleton className="ml-auto h-3 w-12" delay={row * 0.12 + 0.12} />
        </div>
      ))}
    </div>
  );
}
