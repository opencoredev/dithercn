import { Skeleton } from "@/components/dithercn/skeleton";

export default function SkeletonDemo() {
  return (
    <div
      aria-busy="true"
      className="bg-background flex w-full max-w-sm flex-col gap-5 rounded-2xl border p-5"
    >
      <span className="sr-only">Loading post</span>
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" size={40} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" delay={0.09} />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" delay={0.18} />
      <Skeleton shape="text" lines={3} delay={0.27} />
    </div>
  );
}
