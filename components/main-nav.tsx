"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const isActive = (pathname: string, href: string) =>
  href === "/docs" ? pathname === href : pathname.startsWith(href);

export const MainNav = ({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: { href: string; label: string }[];
}) => {
  const pathname = usePathname();

  return (
    <nav className={cn("items-center gap-1", className)} {...props}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground focus-visible:ring-ring/50 relative rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2.5 aria-[current=page]:after:-bottom-[calc((var(--header-height)-2rem)/2+1px)] aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-primary"
          transitionTypes={["nav-forward"]}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};
