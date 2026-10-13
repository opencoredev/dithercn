import { EmptyState } from "@/components/dithercn/empty-state";
import type { EmptyStateIllustration } from "@/components/dithercn/empty-state";
import type { DitherColorName } from "@/lib/dither";

const SCENES: readonly {
  illustration: EmptyStateIllustration;
  color: DitherColorName;
  title: string;
}[] = [
  { color: "ink", illustration: "box", title: "No orders yet" },
  { color: "grey", illustration: "search", title: "No matches" },
  { color: "orange", illustration: "folder", title: "This folder is empty" },
  { color: "purple", illustration: "planet", title: "Nothing in orbit" },
];

export default function EmptyStateIllustrations() {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {SCENES.map(({ illustration, color, title }) => (
        <EmptyState
          key={illustration}
          illustration={illustration}
          color={color}
          title={title}
          titleAs="h4"
          className="bg-background ring-border rounded-xl px-4 py-6 ring-1"
        />
      ))}
    </div>
  );
}
