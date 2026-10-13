"use client";

import { BookOpen01Icon, GridViewIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * The landing hero's two calls to action. A client component because the
 * icons must render on the same side as Button's Slot, or hydration drops
 * the buttons.
 */
export const HeroActions = () => (
  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
    <Button asChild size="lg" className="rounded-full">
      <Link href={ROUTES.DOCS} transitionTypes={["nav-forward"]}>
        <Icon icon={BookOpen01Icon} />
        Read the docs
      </Link>
    </Button>
    <Button asChild size="lg" variant="outline" className="rounded-full">
      <Link href={ROUTES.DOCS_CATALOG} transitionTypes={["nav-forward"]}>
        <Icon icon={GridViewIcon} />
        Browse the catalog
      </Link>
    </Button>
  </div>
);
