import { Eclipse } from "@/components/dithercn/eclipse";

export default function EclipseAmber() {
  return (
    <Eclipse
      size={0.18}
      corona={0.7}
      pulse={1}
      light={20}
      rimColor="oklch(0.8 0.15 65)"
      skyColor="oklch(0.14 0.02 60)"
      matrix="bayer8"
      className="absolute inset-0"
    />
  );
}
