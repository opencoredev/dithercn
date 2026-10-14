import { Smoke } from "@/components/dithercn/smoke";

export default function SmokeHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center gap-3 px-6 pt-14 text-center sm:pt-20">
      <Smoke
        height={0.45}
        density={0.8}
        wind={-0.3}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Nothing left to burn
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        With the height at 0.45 the smoke thins out halfway up and leaves the
        top of the box for text.
      </p>
    </section>
  );
}
