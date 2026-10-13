import { EmptyState } from "@/components/dithercn/empty-state";
import type { EmptyStateMotif } from "@/components/dithercn/empty-state";

const STATES: readonly {
  motif: EmptyStateMotif;
  title: string;
  description: string;
}[] = [
  {
    description: "Try a shorter search, or check the spelling.",
    motif: "search",
    title: "No results for “ditehr”",
  },
  {
    description: "Upload a file or drag one onto this page.",
    motif: "folder",
    title: "This folder is empty",
  },
  {
    description: "Data appears once the first event arrives.",
    motif: "chart",
    title: "No data in this range",
  },
  {
    description: "You are all caught up.",
    motif: "inbox",
    title: "Inbox zero",
  },
];

export default function EmptyStateMotifs() {
  return (
    <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
      {STATES.map((state) => (
        <EmptyState
          key={state.motif}
          {...state}
          cell={2}
          className="bg-background rounded-2xl border py-8"
        />
      ))}
    </div>
  );
}
