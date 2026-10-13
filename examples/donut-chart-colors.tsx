import { DonutChart } from "@/components/dithercn/donut-chart";

const BROWSERS = [
  { color: "--chart-1", label: "Chrome", level: 12 / 16, value: 6120 },
  { color: "--chart-3", label: "Safari", level: 12 / 16, value: 2840 },
  { color: "--destructive", label: "Firefox", level: 12 / 16, value: 790 },
  { color: "--muted-foreground", label: "Other", level: 12 / 16, value: 410 },
] as const;

export default function DonutChartColors() {
  return (
    <DonutChart
      data={BROWSERS}
      label="Sessions"
      size={180}
      thickness={36}
      matrix="bayer8"
    />
  );
}
