"use client";

import type { ComponentType } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  FileText,
  GraduationCap,
  Laptop,
  LayoutDashboard,
  LogOut,
  Network,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { signOut } from "@/lib/auth/actions";
import {
  canApproveLeave,
  canViewPeopleDirectory,
  displayName,
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
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname();
  const showOrgAdmin = isOrgAdmin(profile);
  const showPeopleDirectory = canViewPeopleDirectory(profile);
  const showTeamNav = canApproveLeave(profile);

  const employeeNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leave", label: "Leave", icon: CalendarDays },
    { href: "/documents", label: "Documents", icon: FileText },
  ];

  const teamNav: NavItem[] = showTeamNav
    ? [{ href: "/approvals", label: "Approve Leave", icon: CalendarCheck }]
    : [];

  const adminNav: NavItem[] = [
    ...(showPeopleDirectory
      ? [
          { href: "/admin/employees", label: "Employees", icon: Users },
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

  return (
    <aside className="flex h-full w-[244px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-3 py-3">
        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/70"
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

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-3">
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

        <div className="mt-auto space-y-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "bg-[color-mix(in_srgb,#0070F3_9%,white)] font-medium text-[#0B4FBF]"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            )}
          >
            <Settings
              className={cn(
                "size-4",
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "text-[#0070F3]"
                  : undefined,
              )}
            />
            Settings
          </Link>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-2.5">
          <UserAvatar
            name={displayName(profile)}
            src={profile.avatar_url}
            gender={profile.gender}
            size="sm"
            className="size-7"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {displayName(profile)}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {profile.job_title ?? "Team member"}
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
              />
            }
          >
            <LogOut className="size-3.5" />
            Sign out
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You&apos;ll need to sign in again to access your workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={signOut}>
                <SignOutConfirmButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
}

function SignOutConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <AlertDialogAction
      type="submit"
      variant="destructive"
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? <Spinner className="mr-1" /> : null}
      Sign out
    </AlertDialogAction>
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
    <div className="flex flex-col gap-0.5">
      {label ? (
        <p className="px-2 pb-1 text-[11px] text-muted-foreground">{label}</p>
      ) : null}
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
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
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
