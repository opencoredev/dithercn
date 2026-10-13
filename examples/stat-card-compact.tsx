import { StatCard } from "@/components/dithercn/stat-card";

export default function StatCardCompact() {
  return (
    <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
      <StatCard
        label="Deploys"
        value={146}
        delta={4.3}
        deltaLabel="this week"
        className="bg-background"
      />
      <StatCard
        label="Open incidents"
        value={0}
        delta={0}
        deltaLabel="no change"
        className="bg-background"
      />
      <StatCard label="Queue depth" value={1204} className="bg-background" />
    </div>
  );
}
