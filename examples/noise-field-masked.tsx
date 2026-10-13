import { NoiseField } from "@/components/dithercn/noise-field";

export default function NoiseFieldMasked() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
      <NoiseField mask="center" className="absolute inset-0 -z-10" />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance sm:text-4xl">
        Infrastructure you can forget about
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        The texture thins out under the copy and keeps moving at the edges.
      </p>
    </section>
  );
}
