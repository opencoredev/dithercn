import { Contours } from "@/components/dithercn/contours";

export default function ContoursSurvey() {
  return (
    <Contours
      lines={18}
      scale={0.8}
      relief={0.6}
      cell={2}
      palette={[
        "--dither-paper",
        "oklch(0.62 0.09 145)",
        "oklch(0.48 0.11 55)",
      ]}
      className="absolute inset-0"
    />
  );
}
