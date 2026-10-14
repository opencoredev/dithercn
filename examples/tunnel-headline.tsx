import { Tunnel } from "@/components/dithercn/tunnel";

export default function TunnelHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Tunnel
        spokes={0}
        rings={0.8}
        fog={2.6}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-xs text-3xl font-medium tracking-[-0.03em] text-balance">
        Further in
      </h3>
      <p className="text-muted-foreground max-w-[16rem] text-sm text-pretty">
        The rings fade out before they reach the middle, which leaves a clear
        space for a few words.
      </p>
    </section>
  );
}
