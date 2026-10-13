import { Aurora } from "@/components/dithercn/aurora";

export default function AuroraBanner() {
  return (
    <div className="bg-background border-border relative isolate flex h-36 w-full max-w-lg [--dither-paper:var(--background)] items-end overflow-hidden rounded-2xl border p-5">
      <Aurora
        height={0.62}
        sway={0.6}
        animate={false}
        stillTime={40}
        cell={2}
        className="absolute inset-0 -z-10"
      />
      <div className="flex w-full items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-medium">Dark mode is here</span>
          <span className="text-muted-foreground text-sm">
            Turn it on in Settings.
          </span>
        </div>
        <span className="text-muted-foreground font-mono text-xs">v2.4</span>
      </div>
    </div>
  );
}
