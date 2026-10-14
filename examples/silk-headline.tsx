import { Silk } from "@/components/dithercn/silk";

export default function SilkHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Silk
        angle={80}
        folds={4}
        sheen={0.8}
        intensity={0.45}
        speed={0.7}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        The autumn collection
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        A lower intensity keeps the brightest crest below full ink, so the text
        reads on top.
      </p>
    </section>
  );
}
