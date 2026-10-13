import type { UptimeDay } from "@/components/dithercn/uptime-bar";

/** Incidents by days before the last day, with that day's uptime. */
type Incidents = Readonly<Record<number, { uptime: number; note: string }>>;

const LAST_DAY = Date.UTC(2026, 9, 13);
const DAY = 86_400_000;

/**
 * 90 days of made-up uptime ending on a fixed date, so the server and the
 * browser render the same bars. `missing` days at the start have no data.
 */
export const uptimeDays = ({
  incidents = {},
  missing = 0,
}: {
  incidents?: Incidents;
  missing?: number;
}): UptimeDay[] =>
  Array.from({ length: 90 }, (_, index) => {
    const ago = 89 - index;
    const date = new Date(LAST_DAY - ago * DAY).toISOString().slice(0, 10);
    if (index < missing) {
      return { date, uptime: null };
    }
    const incident = incidents[ago];
    return incident
      ? { date, note: incident.note, uptime: incident.uptime }
      : { date, uptime: 1 };
  });
