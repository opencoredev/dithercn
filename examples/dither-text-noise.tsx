import { DitherText } from "@/components/dithercn/dither-text";

export default function DitherTextNoise() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <DitherText
        as="h3"
        fill="noise"
        scale={2.4}
        from={0.35}
        to={1}
        matrix="blue-noise"
        palette={["transparent", "--chart-4", "--dither-ink"]}
        className="text-5xl leading-none font-semibold tracking-[-0.05em] sm:text-7xl"
      >
        Weather report
      </DitherText>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        Blue noise and a three-colour palette give the letters a soft, grainy
        drift instead of a grid.
      </p>
    </div>
  );
}
