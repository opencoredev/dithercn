import { StatCard } from "@/components/dithercn/stat-card";

const REVENUE = [
  31.2, 32.8, 32.1, 34.6, 35.9, 35.2, 37.8, 39.4, 38.7, 41.2, 43.9, 42.8, 45.1,
  48.2,
] as const;

export default function StatCardDemo() {
  return (
    <StatCard
      label="Monthly recurring revenue"
      value="$48,210"
      delta={12.4}
      deltaLabel="vs last month"
      trend={REVENUE}
      className="bg-background w-full max-w-xs"
    />
  );
}
