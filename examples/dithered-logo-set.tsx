import { DitheredLogo } from "@/components/dithercn/dithered-logo";

const LOGOS = [
  "cobaltic",
  "ferrovane",
  "halcyra",
  "lumenade",
  "northpine",
  "orbitline",
  "quillwork",
  "vantor",
];

export default function DitheredLogoSet() {
  return (
    <div className="grid w-full grid-cols-2 place-items-center gap-x-8 gap-y-10 sm:grid-cols-4">
      {LOGOS.map((name) => (
        <DitheredLogo
          key={name}
          src={`/examples/logos/${name}.svg`}
          alt={name}
          className="h-7 max-w-full"
        />
      ))}
    </div>
  );
}
