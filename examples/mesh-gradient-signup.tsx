import { MeshGradient } from "@/components/dithercn/mesh-gradient";

export default function MeshGradientSignup() {
  return (
    <div className="relative isolate flex size-full items-center justify-center p-6">
      <MeshGradient
        blobs={3}
        size={0.75}
        cell={5}
        speed={0.6}
        className="absolute inset-0 -z-10"
      />
      <form className="bg-background/85 border-border flex w-full max-w-xs flex-col gap-3 rounded-2xl border p-5 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <span className="font-medium">Join the waitlist</span>
          <span className="text-muted-foreground text-sm">
            One email when the beta opens.
          </span>
        </div>
        <label className="sr-only" htmlFor="mesh-gradient-email">
          Email
        </label>
        <input
          id="mesh-gradient-email"
          type="email"
          placeholder="you@company.com"
          className="bg-background border-input focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <button
          type="button"
          className="bg-primary text-primary-foreground h-9 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
        >
          Request access
        </button>
      </form>
    </div>
  );
}
