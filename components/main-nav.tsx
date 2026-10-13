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
          className="text-muted-foreground hover:bg-accent/60 hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground focus-visible:ring-ring/50 rounded-full px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]"
          transitionTypes={["nav-forward"]}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};
