import { LogoMark } from "@/components/logo";

export const ComingSoon = () => (
  <aside className="bg-card text-card-foreground not-first:mt-6 flex gap-3 rounded-xl p-4 text-sm">
    <LogoMark className="text-primary mt-0.5 size-4 shrink-0" />
    <div className="flex flex-col gap-1">
      <p className="font-semibold">Coming soon</p>
      <p className="text-foreground/80">
        This piece isn't in the registry yet. This page describes what's
        planned, so names and props may still change.
      </p>
    </div>
  </aside>
);
