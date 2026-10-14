"use client";

import { GridViewIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * The landing hero's call to action. A client component because the icon
 * must render on the same side as Button's Slot, or hydration drops the
 * button.
 */
export const HeroActions = () => (
  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
    <Button asChild size="lg" variant="inverse">
      <Link href={ROUTES.DOCS_EXAMPLES} transitionTypes={["nav-forward"]}>
        <Icon icon={GridViewIcon} />
        See the examples
      </Link>
    </Button>
  </div>
);
