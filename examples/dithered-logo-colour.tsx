import { DitheredLogo } from "@/components/dithercn/dithered-logo";

// A three-colour mark, inline so the example needs no extra file.
const PRISM = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="104" viewBox="0 0 120 104"><path d="M60 0 120 104H0z" fill="#ff6b3d"/><path d="M60 34 96 98H24z" fill="#ffd23d"/><path d="M60 64 78 98H42z" fill="#3d8bff"/></svg>`
)}`;

export default function DitheredLogoColour() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-12">
      <figure className="flex flex-col items-center gap-3">
        <DitheredLogo
          src={PRISM}
          alt="Prism, in its own colours"
          ratio={120 / 104}
          tone="original"
          cell={2}
          fill="gradient"
          floor={0.15}
          className="h-28"
        />
        <figcaption className="text-muted-foreground font-mono text-xs">
          tone=&quot;original&quot;
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <DitheredLogo
          src={PRISM}
          alt="Prism, in green ink"
          ratio={120 / 104}
          color="green"
          cell={2}
          fill="gradient"
          floor={0.15}
          className="h-28"
        />
        <figcaption className="text-muted-foreground font-mono text-xs">
          color=&quot;green&quot;
        </figcaption>
      </figure>
    </div>
  );
}
