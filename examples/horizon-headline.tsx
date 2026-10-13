import { Horizon } from "@/components/dithercn/horizon";

export default function HorizonHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center gap-3 px-6 pt-12 text-center sm:pt-16">
      <Horizon
        horizon={0.22}
        curve={0.85}
        stars={1.6}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Mission control for your releases
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        A small, round planet low in the frame, with more stars.
      </p>
    </section>
  );
}
