"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  /** Path prefixes, besides `href` itself, that keep the link current. */
  match?: string[];
}

const isActive = (pathname: string, { href, match = [] }: NavItem) =>
  pathname === href || match.some((prefix) => pathname.startsWith(prefix));

export const MainNav = ({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: NavItem[];
}) => {
  const pathname = usePathname();

  return (
    <nav className={cn("items-center gap-1", className)} {...props}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item) ? "page" : undefined}
          className="text-muted-foreground hover:bg-accent/60 hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground focus-visible:ring-ring/50 rounded-full px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]"
          transitionTypes={["nav-forward"]}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};
