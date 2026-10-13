import { ImageTransition } from "@/components/dithercn/image-transition";

export default function ImageTransitionHero() {
  return (
    <section className="relative isolate flex size-full items-end overflow-hidden p-6 sm:p-10">
      <ImageTransition
        images={[
          { alt: "", src: "/examples/tetons.jpg" },
          { alt: "", src: "/examples/earthrise.jpg" },
        ]}
        interval={3500}
        duration={2400}
        cell={6}
        method="bayer8"
        transitionMatrix="bayer4"
        aria-hidden
        className="absolute inset-0 -z-10 size-full"
      />
      <div className="bg-background/80 flex max-w-sm flex-col gap-2 rounded-xl p-5 backdrop-blur-sm">
        <h3 className="text-2xl font-medium tracking-[-0.03em] text-balance">
          Landscapes, near and far
        </h3>
        <p className="text-muted-foreground text-sm text-pretty">
          Large cells and a slow dissolve turn two photos into a quiet backdrop.
        </p>
      </div>
    </section>
  );
}
