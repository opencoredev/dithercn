import { StatCard } from "@/components/dithercn/stat-card";

export default function StatCardGrid() {
  return (
    <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
      <StatCard
        label="Active users"
        value={12_480}
        delta={8.1}
        deltaLabel="vs last week"
        trend={[9.8, 10.2, 10.1, 10.9, 11.4, 11.2, 11.9, 12.5]}
        className="bg-background"
      />
      <StatCard
        label="p95 latency"
        value="184 ms"
        delta={9.6}
        good="down"
        deltaLabel="vs last week"
        trend={[162, 158, 166, 171, 169, 177, 190, 184]}
        color="--destructive"
        className="bg-background"
      />
      <StatCard
        label="Error rate"
        value="0.42%"
        delta={-31.2}
        good="down"
        deltaLabel="vs last week"
        trend={[0.71, 0.66, 0.69, 0.58, 0.55, 0.49, 0.44, 0.42]}
        className="bg-background"
      />
      <StatCard
        label="Trial conversion"
        value="18.6%"
        delta={1.3}
        deltaLabel="vs last week"
        trend={[17.1, 17.4, 17.2, 17.9, 18.1, 17.8, 18.3, 18.6]}
        className="bg-background"
      />
    </div>
  );
}
