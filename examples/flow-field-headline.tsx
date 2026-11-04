import { FlowField } from "@/components/dithercn/flow-field";

export default function FlowFieldHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-start justify-center gap-3 px-6 sm:px-10">
      <FlowField
        density={0.7}
        turbulence={0.5}
        trail={0.8}
        angle={82}
        speed={0.6}
        palette={[
          "--dither-paper",
          "color-mix(in oklch, var(--dither-ink) 22%, var(--dither-paper))",
          "color-mix(in oklch, var(--dither-ink) 45%, var(--dither-paper))",
        ]}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Deploys that go where the traffic goes
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        Fewer lines, a gentle wind and two soft tints of the ink keep the
        streaks quiet behind the text.
      </p>
    </section>
  );
}
