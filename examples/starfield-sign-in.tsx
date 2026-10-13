import { Starfield } from "@/components/dithercn/starfield";

export default function StarfieldSignIn() {
  return (
    <div className="relative isolate flex size-full items-center justify-center p-6">
      <Starfield
        angle={200}
        drift={1}
        nebula={0.8}
        className="absolute inset-0 -z-10"
      />
      <form className="bg-background/80 flex w-full max-w-xs flex-col gap-3 rounded-2xl border p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium">Sign in to Orbit</h3>
          <p className="text-muted-foreground text-sm">
            Use the email you signed up with.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="bg-background focus-visible:ring-ring h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
          />
        </label>
        <button
          type="button"
          className="bg-primary text-primary-foreground focus-visible:ring-ring h-9 rounded-lg text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
