import { UptimeBar } from "@/components/dithercn/uptime-bar";
import { uptimeDays } from "@/examples/uptime-bar-data";

const DAYS = uptimeDays({
  incidents: {
    17: {
      note: "Partial outage in us-east after a failed deploy.",
      uptime: 0.9581,
    },
    18: { note: "Recovery and backfill.", uptime: 0.9978 },
    4: { note: "Elevated latency on writes for 22 minutes.", uptime: 0.9962 },
    51: { note: "Slow responses from the search index.", uptime: 0.9934 },
  },
});

export default function UptimeBarDemo() {
  return (
    <div className="w-full max-w-2xl pt-16">
      <UptimeBar label="API" days={DAYS} />
    </div>
  );
}
