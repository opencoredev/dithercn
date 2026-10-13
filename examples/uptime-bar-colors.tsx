import { UptimeBar } from "@/components/dithercn/uptime-bar";
import { uptimeDays } from "@/examples/uptime-bar-data";

const DAYS = uptimeDays({
  incidents: {
    0: { note: "Payments failing for card brands in the EU.", uptime: 0.9412 },
    37: { note: "3-D Secure challenges timing out.", uptime: 0.9907 },
    9: { note: "Slow payouts for 40 minutes.", uptime: 0.9958 },
  },
});

export default function UptimeBarColors() {
  return (
    <div className="w-full max-w-2xl pt-16">
      <UptimeBar
        label="Payments"
        days={DAYS}
        cell={3}
        fill="dotted"
        colors={{ degraded: "purple", up: "blue" }}
        bloom="high"
      />
    </div>
  );
}
