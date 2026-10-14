import { Tunnel } from "@/components/dithercn/tunnel";

export default function TunnelSquare() {
  return (
    <Tunnel
      shape="square"
      spokes={8}
      rings={1.3}
      center={[0.5, 0.42]}
      sway={0.4}
      matrix="bayer8"
      palette={["--dither-paper", "--chart-5", "--chart-1"]}
      className="absolute inset-0"
    />
  );
}
