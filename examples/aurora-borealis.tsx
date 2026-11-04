import { Aurora } from "@/components/dithercn/aurora";

export default function AuroraBorealis() {
  return (
    <div className="absolute inset-0 bg-(--sky) [--edge:oklch(0.62_0.17_155)] [--sky:oklch(0.975_0.012_290)] [--tip:oklch(0.58_0.19_300)] dark:[--edge:oklch(0.8_0.18_150)] dark:[--sky:oklch(0.14_0.03_250)] dark:[--tip:oklch(0.55_0.16_300)]">
      <Aurora
        background="--sky"
        color="--edge"
        tipColor="--tip"
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
