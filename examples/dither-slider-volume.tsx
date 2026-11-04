"use client";

import {
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMute02Icon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";

import { DitherSlider } from "@/components/dithercn/dither-slider";
import { Icon } from "@/components/icon";

const iconFor = (level: number) => {
  if (level === 0) {
    return VolumeMute02Icon;
  }
  return level < 6 ? VolumeLowIcon : VolumeHighIcon;
};

export default function DitherSliderVolume() {
  const [volume, setVolume] = useState([7]);
  const level = volume[0] ?? 0;

  return (
    <div className="bg-background border-border flex w-full max-w-sm items-end gap-3 rounded-2xl border p-5 [--dither-paper:var(--background)]">
      <button
        type="button"
        aria-label={level === 0 ? "Unmute" : "Mute"}
        className="text-muted-foreground hover:text-foreground focus-visible:outline-ring mb-[5px] flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md outline-hidden focus-visible:outline-2 [&_svg]:size-4.5"
        onClick={() => setVolume([level === 0 ? 7 : 0])}
      >
        <Icon icon={iconFor(level)} />
      </button>
      <DitherSlider
        label="Volume"
        value={volume}
        onValueChange={setVolume}
        min={0}
        max={10}
        step={1}
        ticks
        size="lg"
        color="purple"
        bloom="low"
        className="min-w-0 flex-1"
      />
    </div>
  );
}
