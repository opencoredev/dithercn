import { ProgressBar } from "@/components/dithercn/progress-bar";

const QUOTAS = [
  { label: "Storage", max: 10, unit: "GB", used: 7.2 },
  { label: "Bandwidth", max: 1000, unit: "GB", used: 312 },
  { label: "Build minutes", max: 6000, unit: "min", used: 5770 },
] as const;

export default function ProgressBarQuota() {
  return (
    <div className="bg-background flex w-full max-w-md flex-col gap-5 rounded-xl border p-5">
      <div className="flex flex-col gap-1">
        <span className="font-medium">Usage this cycle</span>
        <span className="text-muted-foreground text-sm">
          Resets on November 1
        </span>
      </div>
      {QUOTAS.map(({ label, max, unit, used }) => {
        const nearLimit = used / max > 0.9;
        return (
          <ProgressBar
            key={label}
            label={label}
            value={used}
            max={max}
            size="sm"
            valueText={`${used.toLocaleString("en-US")} of ${max.toLocaleString("en-US")} ${unit}`}
            color={nearLimit ? "--destructive" : "--dither-ink"}
          />
        );
      })}
    </div>
  );
}
