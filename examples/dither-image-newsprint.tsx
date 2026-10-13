import { DitherImage } from "@/components/dithercn/dither-image";

export default function DitherImageNewsprint() {
  return (
    <article className="flex w-full max-w-2xl flex-col gap-5 rounded-2xl bg-[oklch(0.93_0.022_88)] p-5 text-[oklch(0.22_0.012_70)] sm:flex-row sm:p-6">
      <DitherImage
        src="/examples/earthrise.jpg"
        alt="Earth rising over the Moon's horizon, photographed from Apollo 8"
        preset="newsprint"
        ratio={1}
        className="w-full shrink-0 sm:w-56"
      />
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
          Late edition · 25 December 1968
        </span>
        <h3 className="font-serif text-2xl leading-tight font-semibold text-balance">
          Three men orbit the Moon and see the Earth rise
        </h3>
        <p className="text-sm leading-relaxed opacity-80">
          The newsprint preset uses an ordered 8 by 8 screen and its own warm
          paper, so the page reads as print in both themes.
        </p>
      </div>
    </article>
  );
}
