import { Gauge } from "@/components/dithercn/gauge";

export default function GaugeRing() {
  return (
    <div className="bg-background flex w-full max-w-md flex-wrap items-center gap-6 rounded-xl border p-5">
      <Gauge
        variant="ring"
        value={63}
        label="budget left"
        unit="%"
        size={148}
      />
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <span className="font-medium">Checkout API error budget</span>
        <span className="text-muted-foreground text-sm text-pretty">
          SLO 99.9% over 30 days. 16 of 43 minutes used.
        </span>
        <span className="text-muted-foreground mt-2 font-mono text-xs">
          Burn rate 0.8×
        </span>
      </div>
    </div>
  );
}
