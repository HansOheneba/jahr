"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  ChartPie,
  FileText,
  GraduationCap,
  IdCard,
  Laptop,
  LayoutDashboard,
  Megaphone,
  Network,
  ScrollText,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Separator } from "@/components/ui/separator";
import {
  canApproveLeave,
  canPublishComms,
  canViewPeopleDirectory,
  isOrgAdmin,
  type ProfileWithOrg,
} from "@/lib/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface AppSidebarProps {
  profile: ProfileWithOrg;
  /** Desktop rail vs mobile sheet drawer. */
  variant?: "desktop" | "drawer";
  className?: string;
}

export function AppSidebar({
  profile,
  variant = "desktop",
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const showOrgAdmin = isOrgAdmin(profile);
  const showPeopleDirectory = canViewPeopleDirectory(profile);
  const showTeamNav = canApproveLeave(profile);
  const showComms = canPublishComms(profile);
  const isDrawer = variant === "drawer";

  const employeeNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/leave", label: "Leave", icon: CalendarDays },
    { href: "/documents", label: "Documents", icon: FileText },
  ];

  const teamNav: NavItem[] = showTeamNav
    ? [{ href: "/approvals", label: "Approve Leave", icon: CalendarCheck }]
    : [];

  const adminNav: NavItem[] = [
    ...(showComms
      ? [{ href: "/admin/comms", label: "Comms", icon: Megaphone }]
      : []),
    ...(showPeopleDirectory
      ? [
          { href: "/admin/employees", label: "Employees", icon: Users },
          { href: "/admin/insights", label: "Insights", icon: ChartPie },
          { href: "/admin/alumni", label: "Alumni", icon: GraduationCap },
          { href: "/admin/organogram", label: "Organogram", icon: Network },
        ]
      : []),
    ...(showOrgAdmin
      ? [
          {
            href: "/admin/payroll",
            label: "Payroll",
            icon: Wallet,
          },
          {
            href: "/admin/payroll/register",
            label: "Payslip register",
            icon: ScrollText,
          },
          {
            href: "/admin/permits",
            label: "Work permits",
            icon: IdCard,
          },
          {
            href: "/admin/devices",
            label: "Devices",
            icon: Laptop,
          },
          {
            href: "/admin/organisation",
            label: "Organisation",
            icon: Building2,
          },
        ]
      : []),
  ];

  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground",
        isDrawer
          ? "w-full border-0"
          : "w-[244px] max-w-[244px] shrink-0 border-r border-sidebar-border",
        className,
      )}
    >
      <div
        className={cn(
          "shrink-0 px-3 py-3",
          isDrawer && "pr-12",
        )}
      >
        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-1 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-secondary/70 active:scale-[0.98]"
        >
          <BrandLogo
            tone="navy"
            align="center"
            className="h-7 w-full max-w-[150px]"
          />
          <span className="text-[10px] font-medium tracking-[0.18em] text-[#1f2353]/70 uppercase">
            TMS
          </span>
        </Link>
      </div>

      <nav className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pb-2">
        <NavSection items={employeeNav} pathname={pathname} />

        {teamNav.length > 0 ? (
          <>
            <Separator className="mx-1" />
            <NavSection label="Team" items={teamNav} pathname={pathname} />
          </>
        ) : null}

        {adminNav.length > 0 ? (
          <>
            <Separator className="mx-1" />
            <NavSection label="Admin" items={adminNav} pathname={pathname} />
          </>
        ) : null}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border px-2 pt-2",
          isDrawer
            ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            : "pb-3",
        )}
      >
        <Link
          href="/settings"
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]",
            settingsActive
              ? "bg-[color-mix(in_srgb,#0070F3_9%,white)] font-medium text-[#0B4FBF]"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
          )}
        >
          <Settings
            className={cn(
              "size-4 shrink-0",
              settingsActive ? "text-[#0070F3]" : undefined,
            )}
          />
          <span className="truncate">Settings</span>
        </Link>
      </div>
    </aside>
  );
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {label ? (
        <p className="px-2 pb-1 text-[11px] text-muted-foreground">{label}</p>
      ) : null}
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href, items);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]",
              active
                ? "bg-[color-mix(in_srgb,#0070F3_9%,white)] font-medium text-[#0B4FBF]"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-[#0070F3]" : undefined,
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function isNavItemActive(
  pathname: string,
  href: string,
  items: NavItem[],
): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  return !items.some(
    (other) =>
      other.href !== href &&
      other.href.startsWith(`${href}/`) &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
}
