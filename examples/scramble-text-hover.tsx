import {
  ScrambleText,
  SCRAMBLE_MONO,
} from "@/components/dithercn/scramble-text";

const LINKS = ["Docs", "Components", "Changelog", "Pricing"];

export default function ScrambleTextHover() {
  return (
    <nav
      aria-label="Example"
      className="bg-background flex flex-wrap items-center justify-center gap-1 rounded-full p-1.5"
    >
      {LINKS.map((label) => (
        <a
          key={label}
          href="#scramble-hover"
          className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring/50 rounded-full px-3.5 py-2 font-mono text-xs tracking-[0.12em] uppercase transition-colors duration-150 outline-none focus-visible:ring-[3px]"
        >
          <ScrambleText
            trigger="hover"
            mode="glyphs"
            characters={SCRAMBLE_MONO}
            duration={260}
            stagger={22}
          >
            {label}
          </ScrambleText>
        </a>
      ))}
    </nav>
  );
}
