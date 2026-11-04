import { Caustics } from "@/components/dithercn/caustics";

export default function CausticsHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Caustics
        scale={3.5}
        focus={0.85}
        mask="center"
        speed={0.8}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Open all summer
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        The light fades out in the middle and leaves dim water behind the words,
        so nothing crosses the text.
      </p>
    </section>
  );
}
