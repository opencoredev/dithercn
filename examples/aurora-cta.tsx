import { Aurora } from "@/components/dithercn/aurora";

export default function AuroraCta() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-end gap-5 px-6 pb-12 text-center">
      <Aurora
        direction="down"
        height={0.14}
        curtains={2}
        spread={0.06}
        rays={5}
        length={0.4}
        sway={0.75}
        cell={4}
        matrix="bayer4"
        className="absolute inset-0 -z-10"
      />
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-medium tracking-[-0.02em] text-balance sm:text-3xl">
          Start shipping tonight
        </h3>
        <p className="text-muted-foreground mx-auto max-w-xs text-sm text-pretty">
          Free for side projects. No card needed.
        </p>
      </div>
      <button
        type="button"
        className="bg-foreground text-background focus-visible:ring-ring/60 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-[scale,opacity] duration-150 outline-none hover:opacity-90 focus-visible:ring-2 active:scale-[0.97]"
      >
        Create a project
      </button>
    </section>
  );
}
