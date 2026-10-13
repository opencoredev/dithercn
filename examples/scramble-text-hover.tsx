import { ScrambleText } from "@/components/dithercn/scramble-text";

const LINKS = ["Docs", "Components", "Changelog", "Pricing"];

export default function ScrambleTextHover() {
  return (
    <nav aria-label="Example" className="flex flex-wrap justify-center gap-1">
      {LINKS.map((label) => (
        <a
          key={label}
          href="#scramble-hover"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-md px-3 py-2 font-mono text-sm tracking-wide uppercase transition-colors duration-150 outline-none focus-visible:ring-[3px]"
        >
          <ScrambleText
            trigger="hover"
            duration={420}
            delay={60}
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
          >
            {label}
          </ScrambleText>
        </a>
      ))}
    </nav>
  );
}
