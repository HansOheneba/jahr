"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/operations/petty-cash", label: "Overview" },
  { href: "/operations/petty-cash/transactions", label: "Transactions" },
  { href: "/operations/petty-cash/reconciliations", label: "Reconciliations" },
  { href: "/operations/petty-cash/replenishments", label: "Replenishments" },
  { href: "/operations/petty-cash/reports", label: "Reports" },
  { href: "/operations/petty-cash/settings", label: "Settings", manage: true },
] as const;

export function PettyCashSubnav({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.filter((link) => !("manage" in link) || canManage).map((link) => {
        const active =
          link.href === "/operations/petty-cash"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
