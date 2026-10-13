import { ProgressBar } from "@/components/dithercn/progress-bar";

const TASKS = [
  { done: true, label: "Create a project" },
  { done: true, label: "Connect a repository" },
  { done: true, label: "Add a custom domain" },
  { done: false, label: "Invite your team" },
  { done: false, label: "Turn on alerts" },
] as const;

const done = TASKS.filter((task) => task.done).length;

export default function ProgressBarSteps() {
  return (
    <div className="bg-background border-border flex w-full max-w-sm flex-col gap-5 rounded-2xl border p-5 [--dither-paper:var(--background)]">
      <ProgressBar
        label="Getting started"
        value={done}
        max={TASKS.length}
        valueText={`${done} of ${TASKS.length}`}
        segments={TASKS.length}
        color="orange"
        fill="dotted"
        size="lg"
      />
      <ul className="flex flex-col gap-2 text-sm">
        {TASKS.map((task) => (
          <li key={task.label} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className={
                task.done
                  ? "bg-dither-orange size-2 rounded-[2px]"
                  : "border-border size-2 rounded-[2px] border"
              }
            />
            <span
              className={
                task.done
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }
            >
              {task.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
