import { DonutChart } from "@/components/dithercn/donut-chart";

const REGIONS = [
  { label: "North America", value: 48_210 },
  { label: "Europe", value: 31_870 },
  { label: "Asia Pacific", value: 17_430 },
  { label: "South America", value: 6340 },
  { label: "Africa", value: 2150 },
] as const;

export default function DonutChartDemo() {
  return <DonutChart data={REGIONS} label="Requests today" />;
}
