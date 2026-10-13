import { DotMap } from "@/components/dithercn/dot-map";
import type { DotMapBounds } from "@/components/dithercn/dot-map";
import { EDGE_REGIONS } from "@/examples/dot-map-data";

const EUROPE: DotMapBounds = { east: 32, north: 66, south: 34, west: -14 };

const LATENCY = [
  { ms: 8, region: "fra1" },
  { ms: 11, region: "lhr1" },
  { ms: 14, region: "cdg1" },
  { ms: 23, region: "mad1" },
];

export default function DotMapRegions() {
  return (
    <div className="bg-background flex w-full max-w-md flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Edge regions</span>
        <span className="text-muted-foreground font-mono text-xs">7 live</span>
      </div>
      <DotMap
        markers={EDGE_REGIONS}
        bounds={EUROPE}
        columns={92}
        accent="blue"
        halo={4}
        title="Edge regions in Europe"
      />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-xs">
        {LATENCY.map((row) => (
          <li key={row.region} className="flex justify-between">
            <span className="text-muted-foreground">{row.region}</span>
            <span className="tabular-nums">{row.ms} ms</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
