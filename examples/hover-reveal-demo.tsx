import { HoverReveal } from "@/components/dithercn/hover-reveal";

export default function HoverRevealDemo() {
  return (
    <figure className="flex w-full max-w-xl flex-col gap-3">
      <HoverReveal
        src="/examples/tetons.jpg"
        alt="The Tetons and the Snake River, photographed by Ansel Adams in 1942"
        className="aspect-5/4 w-full rounded-xl"
      />
      <figcaption className="text-muted-foreground text-center font-mono text-xs">
        Hover to look through the dither. On touch, tap.
      </figcaption>
    </figure>
  );
}
