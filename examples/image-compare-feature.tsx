import { ImageCompare } from "@/components/dithercn/image-compare";

export default function ImageCompareFeature() {
  return (
    <section className="grid w-full max-w-3xl items-center gap-8 sm:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-3">
        <span className="text-primary font-mono text-xs tracking-[0.14em] uppercase">
          Brand kit
        </span>
        <h3 className="text-2xl font-medium tracking-tight text-balance">
          Every photo, in your house style
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          Drop in any photo and it comes out in two brand colours, with the same
          grain as the rest of the site. Drag the divider to see what changed.
        </p>
      </div>
      <ImageCompare
        src="/examples/earthrise.jpg"
        alt="Earthrise from Apollo 8, in brand duotone on the left and the original on the right"
        before={{ color: "purple", kind: "dither", preset: "duotone" }}
        beforeLabel="Brand"
        defaultValue={58}
        ratio={4 / 3}
        className="w-full rounded-xl"
      />
    </section>
  );
}
