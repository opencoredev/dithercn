import { cn } from "@/lib/utils";

const ROLL_CLS =
  "block transition-transform duration-[400ms] ease-(--ease-out) motion-reduce:transition-none";

/**
 * A label that rolls up to a copy of itself when its `group/roll` parent is
 * hovered or keyboard-focused. The copy is hidden from assistive tech, so
 * the accessible name is read once.
 */
export const RollLabel = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => (
  <span className={cn("relative block overflow-hidden", className)}>
    <span
      className={cn(
        ROLL_CLS,
        "group-hover/roll:-translate-y-full group-focus-visible/roll:-translate-y-full"
      )}
    >
      {children}
    </span>
    <span
      aria-hidden="true"
      className={cn(
        ROLL_CLS,
        "absolute inset-0 translate-y-full group-hover/roll:translate-y-0 group-focus-visible/roll:translate-y-0"
      )}
    >
      {children}
    </span>
  </span>
);
