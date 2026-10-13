import { UptimeBar } from "@/components/dithercn/uptime-bar";
import { uptimeDays } from "@/examples/uptime-bar-data";

const SERVICES = [
  {
    days: uptimeDays({
      incidents: {
        30: { note: "Login loop for some SSO users.", uptime: 0.9946 },
      },
    }),
    label: "Dashboard",
  },
  {
    days: uptimeDays({
      incidents: {
        2: { note: "Webhooks delayed up to 9 minutes.", uptime: 0.9971 },
        63: { note: "Queue backlog after a broker restart.", uptime: 0.9902 },
      },
    }),
    label: "Webhooks",
  },
  {
    days: uptimeDays({
      incidents: {
        11: { note: "Edge cache purge failed in two regions.", uptime: 0.9718 },
      },
    }),
    label: "CDN",
  },
  {
    days: uptimeDays({ missing: 58 }),
    label: "Realtime",
  },
] as const;

export default function UptimeBarStatusPage() {
  return (
    <div className="bg-background w-full max-w-2xl rounded-xl border">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <span aria-hidden className="bg-dither-ink size-2 rounded-full" />
        <span className="font-medium">All systems operational</span>
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
          Updated 2 min ago
        </span>
      </div>
      <div className="flex flex-col gap-8 px-5 pt-14 pb-5">
        {SERVICES.map(({ label, days }) => (
          <UptimeBar key={label} label={label} days={days} />
        ))}
      </div>
    </div>
  );
}
