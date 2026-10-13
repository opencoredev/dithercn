"use client";

import { useState } from "react";

import { ImageTransition } from "@/components/dithercn/image-transition";
import type { TransitionImage } from "@/components/dithercn/image-transition";

const IMAGES: [TransitionImage, ...TransitionImage[]] = [
  {
    alt: "Earth rising over the Moon's horizon, from Apollo 8",
    src: "/examples/earthrise.jpg",
  },
  {
    alt: "The Tetons and the Snake River, by Ansel Adams",
    src: "/examples/tetons.jpg",
  },
  {
    alt: "Buzz Aldrin on the lunar surface during Apollo 11",
    src: "/examples/aldrin.jpg",
  },
  {
    alt: "The Pillars of Creation, photographed by Hubble",
    src: "/examples/pillars.jpg",
  },
];

export default function ImageTransitionDemo() {
  const [index, setIndex] = useState(0);

  return (
    <figure className="flex w-full max-w-xl flex-col gap-3">
      <ImageTransition
        images={IMAGES}
        onIndexChange={setIndex}
        ratio={4 / 3}
        className="w-full rounded-xl"
      />
      <figcaption className="flex items-center justify-between gap-4 font-mono text-xs">
        <span className="text-muted-foreground truncate">
          {IMAGES[index]?.alt}
        </span>
        <span className="shrink-0 tabular-nums">
          {index + 1} / {IMAGES.length}
        </span>
      </figcaption>
    </figure>
  );
}
