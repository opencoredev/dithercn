import { Horizon } from "@/components/dithercn/horizon";

export default function HorizonSunrise() {
  return (
    <Horizon
      horizon={0.38}
      curve={0.25}
      aurora={0.3}
      stars={0.5}
      glowColor="oklch(0.8 0.15 65)"
      className="absolute inset-0"
    />
  );
}
