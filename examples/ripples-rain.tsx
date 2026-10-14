import { Ripples } from "@/components/dithercn/ripples";

export default function RipplesRain() {
  return (
    <Ripples
      sources={[
        [0.2, 0.3],
        [0.55, 0.7],
        [0.82, 0.25],
        [0.35, 0.92],
      ]}
      rings={14}
      decay={2}
      matrix="bayer8"
      palette={["--dither-paper", "--chart-3", "--chart-2", "--chart-1"]}
      className="absolute inset-0"
    />
  );
}
