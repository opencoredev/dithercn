"use client";

import { LogoMarquee } from "@/components/dithercn/logo-marquee";
import { usePreviewValue } from "@/components/preview-controls";
import { LOGOS } from "@/examples/dithered-logo-data";
import * as knobs from "@/examples/logo-marquee-controls";

export default function LogoMarqueeDemo() {
  const speed = usePreviewValue(knobs.speed);
  const fade = usePreviewValue(knobs.fade);
  const direction = usePreviewValue(knobs.direction);
  const effect = usePreviewValue(knobs.effect);
  const color = usePreviewValue(knobs.ink);

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <p className="text-muted-foreground text-sm">
        Teams that ship with dithercn
      </p>
      <LogoMarquee
        logos={LOGOS}
        label="Customers"
        speed={speed}
        fade={fade}
        direction={direction}
        effect={effect}
        color={color}
      />
    </div>
  );
}
