import { Ridgelines } from "@/components/dithercn/ridgelines";

export default function RidgelinesRange() {
  return (
    <Ridgelines
      lines={40}
      spread={1}
      amplitude={0.7}
      shade={0.4}
      palette={["--dither-paper", "--chart-5", "--chart-1"]}
      className="absolute inset-0"
    />
  );
}
