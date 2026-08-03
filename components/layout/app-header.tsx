"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import type { ProfileWithOrg } from "@/lib/types/database";

const TITLE_BY_PATH: Record<string, string> = {
  "/dashboard": "Overview",
  "/leave": "Leave",
  "/approvals": "Approve Leave",
  "/documents": "Documents",
  "/settings": "Settings",
  "/profile": "Settings",
  "/admin/employees": "Employees",
  "/admin/employees/new": "Add employee",
  "/admin/devices": "Devices",
  "/admin/organisation": "Organisation",
  "/admin/organogram": "Organogram",
};

interface AppHeaderProps {
  profile: ProfileWithOrg;
}

export function AppHeader({ profile }: AppHeaderProps) {
  const pathname = usePathname();
  const title =
    TITLE_BY_PATH[pathname] ??
    Object.entries(TITLE_BY_PATH).find(([path]) =>
      pathname.startsWith(`${path}/`),
    )?.[1] ??
    "Overview";

  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="flex h-12 items-center gap-3 px-4 md:px-6">
        <MobileNav profile={profile} />

        <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <Link
            href="/dashboard"
            className="truncate text-muted-foreground transition-colors hover:text-foreground"
          >
            JA Group
          </Link>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          {isAdmin ? (
            <>
              <span className="truncate text-muted-foreground">Admin</span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            </>
          ) : null}
          <span className="truncate font-medium text-foreground">{title}</span>
        </nav>

        <NotificationsPanel />
      </div>
    </header>
  );
}
