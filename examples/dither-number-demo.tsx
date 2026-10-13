import { DitherNumber } from "@/components/dithercn/dither-number";

export default function DitherNumberDemo() {
  return (
    <div className="flex flex-col items-center gap-5 px-6 text-center">
      <DitherNumber
        value={128_406}
        className="text-6xl leading-none font-semibold tracking-[-0.05em] sm:text-8xl"
      />
      <span className="text-muted-foreground text-sm">
        Components installed this month
      </span>
    </div>
  );
}
