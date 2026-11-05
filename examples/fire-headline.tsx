import { Fire } from "@/components/dithercn/fire";

export default function FireHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center gap-3 px-6 pt-14 text-center sm:pt-20">
      <Fire
        height={0.32}
        scale={1.4}
        wind={-0.2}
        embers={0.6}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Ship it before it cools
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        At a height of 0.32 the tongues stay in the bottom third, and the embers
        thin out well below the text.
      </p>
    </section>
  );
}
