import { DitheredLogo } from "@/components/dithercn/dithered-logo";

export default function DitheredLogoShade() {
  return (
    <div className="flex flex-col items-center gap-8">
      <DitheredLogo
        src="/examples/logos/quillwork.svg"
        alt="Quillwork"
        color="--foreground"
        shade={0}
        className="h-10"
      />
      <DitheredLogo
        src="/examples/logos/quillwork.svg"
        alt="Quillwork"
        shade={0.6}
        className="h-10"
      />
      <DitheredLogo
        src="/examples/logos/quillwork.svg"
        alt="Quillwork"
        color="--chart-3"
        matrix="blue-noise"
        shade={0.85}
        className="h-10"
      />
    </div>
  );
}
