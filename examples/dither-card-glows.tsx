import { DitherCard } from "@/components/dithercn/dither-card";
import type { DitherCardGlow } from "@/components/dithercn/dither-card";
import { cn } from "@/lib/utils";

const CARDS: readonly { glow: DitherCardGlow; title: string; body: string }[] =
  [
    {
      body: "Ship a component with one command.",
      glow: "top",
      title: "Install",
    },
    {
      body: "Every colour follows your theme.",
      glow: "top-right",
      title: "Theme",
    },
    {
      body: "Still frames under reduced motion.",
      glow: "bottom-left",
      title: "Respect",
    },
  ];

export default function DitherCardGlows() {
  return (
    <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
      {CARDS.map((card) => (
        <DitherCard
          key={card.glow}
          glow={card.glow}
          reach={130}
          interactive
          className={cn(
            "bg-background min-h-52 px-5",
            card.glow.startsWith("bottom") ? "justify-start" : "justify-end"
          )}
        >
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-muted-foreground">
              {card.glow}
            </span>
            <span className="font-semibold tracking-tight">{card.title}</span>
            <span className="text-muted-foreground text-sm">{card.body}</span>
          </div>
        </DitherCard>
      ))}
    </div>
  );
}
