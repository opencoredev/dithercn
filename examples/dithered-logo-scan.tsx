import { DitheredLogo } from "@/components/dithercn/dithered-logo";

export default function DitheredLogoScan() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border bg-black px-8 py-12">
      <DitheredLogo
        src="/examples/logos/vantor.svg"
        alt="Vantor"
        ratio={152 / 40}
        cell={3}
        fill="dotted"
        effect="scan"
        period={4}
        color="green"
        className="h-20 max-w-full"
      />
      <p className="font-mono text-xs text-neutral-400">Booting Vantor OS…</p>
    </div>
  );
}
