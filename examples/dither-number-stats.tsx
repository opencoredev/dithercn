import { DitherNumber } from "@/components/dithercn/dither-number";

const STATS = [
  {
    format: {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "percent",
    },
    label: "Uptime, last 90 days",
    value: 0.9998,
  },
  {
    format: { maximumFractionDigits: 1, notation: "compact" },
    label: "Frames rendered",
    value: 2_400_000,
  },
  {
    format: { currency: "USD", maximumFractionDigits: 0, style: "currency" },
    label: "Saved on image hosting",
    value: 18_250,
  },
] satisfies {
  format: Intl.NumberFormatOptions;
  label: string;
  value: number;
}[];

export default function DitherNumberStats() {
  return (
    <dl className="grid w-full max-w-2xl grid-cols-1 gap-8 px-6 sm:grid-cols-3 sm:gap-6">
      {STATS.map(({ format, label, value }) => (
        <div key={label} className="flex flex-col gap-3">
          <dt className="text-muted-foreground order-2 text-sm">{label}</dt>
          <dd className="order-1 text-4xl font-semibold tracking-[-0.04em]">
            <DitherNumber value={value} format={format} locales="en-US" />
          </dd>
        </div>
      ))}
    </dl>
  );
}
