import { DitherGlow } from "@/components/dithercn/dither-glow";

export default function DitherGlowCorner() {
  return (
    <div className="bg-background border-border relative isolate flex w-full max-w-xs [--dither-paper:var(--background)] flex-col gap-4 overflow-hidden rounded-2xl border p-6">
      <DitherGlow
        position="top-right"
        radius={0.55}
        intensity={0.45}
        matrix="bayer8"
        className="absolute inset-0 -z-10"
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Team</span>
        <span className="text-muted-foreground text-sm">
          For groups that ship every week.
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          $24
        </span>
        <span className="text-muted-foreground text-sm">per seat / month</span>
      </div>
      <ul className="text-muted-foreground flex flex-col gap-1.5 text-sm">
        <li>Unlimited projects</li>
        <li>Shared palettes</li>
        <li>Priority support</li>
      </ul>
    </div>
  );
}
