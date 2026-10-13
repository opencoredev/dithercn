import { NoiseField } from "@/components/dithercn/noise-field";

const regions = [
  { name: "eu-west", share: "41%" },
  { name: "us-east", share: "37%" },
  { name: "ap-south", share: "22%" },
];

export default function NoiseFieldTopography() {
  return (
    <div className="bg-background border-border relative isolate flex w-full max-w-md [--dither-paper:var(--background)] flex-col gap-4 overflow-hidden rounded-2xl border p-5 pt-36">
      <NoiseField
        variant="contours"
        bands={5}
        scale={1.1}
        intensity={1}
        mask="bottom"
        maskSize={0.42}
        flow={0.5}
        cell={2}
        className="absolute inset-0 -z-10"
      />
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Traffic by region</span>
        <span className="text-muted-foreground font-mono text-xs">24h</span>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {regions.map((region) => (
          <div key={region.name} className="flex flex-col gap-1">
            <dt className="text-muted-foreground font-mono text-xs">
              {region.name}
            </dt>
            <dd className="text-xl font-semibold tabular-nums">
              {region.share}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
