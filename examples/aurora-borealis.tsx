import { Aurora } from "@/components/dithercn/aurora";

export default function AuroraBorealis() {
  return (
    <div className="absolute inset-0 bg-[oklch(0.14_0.03_250)]">
      <Aurora
        background="oklch(0.14 0.03 250)"
        color="oklch(0.8 0.18 150)"
        tipColor="oklch(0.55 0.16 300)"
        curtains={4}
        height={0.28}
        spread={0.08}
        sway={1.6}
        rays={11}
        length={0.7}
        tilt={-6}
        drift={0.5}
        className="absolute inset-0"
      />
    </div>
  );
}
