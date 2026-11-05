import { Voronoi } from "@/components/dithercn/voronoi";

export default function VoronoiHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Voronoi
        variant="glaze"
        scale={1.2}
        fade={1}
        palette={["--dither-paper", "orange"]}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-sm text-3xl font-medium tracking-[-0.03em] text-balance">
        Every firing cracks its own way
      </h3>
      <p className="text-muted-foreground max-w-[18rem] text-sm text-pretty">
        Small-batch stoneware from a two-kiln studio. The spring glazes go on
        sale Thursday.
      </p>
    </section>
  );
}
