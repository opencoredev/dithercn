"use client";

import { useState } from "react";

import { ImageTransition } from "@/components/dithercn/image-transition";
import type { TransitionImage } from "@/components/dithercn/image-transition";
import { cn } from "@/lib/utils";

const IMAGES: [TransitionImage, ...TransitionImage[]] = [
  { alt: "Apollo 8: Earthrise", src: "/examples/earthrise.jpg" },
  { alt: "Apollo 11: Buzz Aldrin on the Moon", src: "/examples/aldrin.jpg" },
  { alt: "Hubble: the Pillars of Creation", src: "/examples/pillars.jpg" },
];

export default function ImageTransitionControlled() {
  const [index, setIndex] = useState(0);

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <ImageTransition
        images={IMAGES}
        index={index}
        duration={900}
        transitionMatrix="bayer4"
        ratio={16 / 9}
        className="w-full rounded-xl"
      />
      <div
        className="grid grid-cols-3 gap-2"
        role="group"
        aria-label="Choose an image"
      >
        {IMAGES.map((image, position) => (
          <button
            key={image.src}
            type="button"
            aria-pressed={position === index}
            onClick={() => setIndex(position)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-xs transition-colors duration-150",
              "focus-visible:ring-ring outline-none focus-visible:ring-2",
              position === index
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {image.alt.split(":")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
