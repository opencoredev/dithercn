import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";

export type { IconSvgElement };

/**
 * Hugeicons wrapper. Size comes from CSS (`size-*` or the parent's
 * `[&_svg]:size-4` rule), so callers never pass a pixel size.
 */
export const Icon = ({
  icon,
  strokeWidth = 1.75,
  ...props
}: Omit<React.ComponentProps<typeof HugeiconsIcon>, "icon" | "size"> & {
  icon: IconSvgElement;
}) => (
  <HugeiconsIcon
    aria-hidden="true"
    icon={icon}
    strokeWidth={strokeWidth}
    {...props}
  />
);
