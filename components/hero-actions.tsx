"use client";

import { AiMagicIcon, GridViewIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/components/icon";
import { RollLabel } from "@/components/roll-label";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * The landing hero's two calls to action. A client component because the
 * icons must render on the same side as Button's Slot, or hydration drops
 * the buttons.
 */
export const HeroActions = () => (
  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
    <Button asChild size="lg" className="group/roll">
      <Link
        href={ROUTES.DOCS_BUILD_WITH_AGENTS}
        transitionTypes={["nav-forward"]}
      >
        <Icon icon={AiMagicIcon} />
        <RollLabel>Build with agents</RollLabel>
      </Link>
    </Button>
    <Button asChild size="lg" variant="inverse" className="group/roll">
      <Link href={ROUTES.DOCS_EXAMPLES} transitionTypes={["nav-forward"]}>
        <Icon icon={GridViewIcon} />
        <RollLabel>See the examples</RollLabel>
      </Link>
    </Button>
  </div>
);
