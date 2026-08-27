"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AlumniDirectoryEntry } from "@/lib/alumni/types";
import { normalizeGender } from "@/lib/employees/normalize-gender";
import { displayName } from "@/lib/types/database";
import { cn } from "@/lib/utils";

function alumniName(entry: AlumniDirectoryEntry): string {
  return displayName({
    first_name: entry.first_name,
    last_name: entry.last_name,
    preferred_name: entry.preferred_name,
  });
}

function alumniEmail(entry: AlumniDirectoryEntry): string {
  if (entry.source === "profile") return entry.email;
  return entry.email ?? entry.personal_email ?? "—";
}

function alumniPlacement(entry: AlumniDirectoryEntry): string {
  if (entry.source === "profile") {
    return (
      entry.department_name ?? entry.business_unit_name ?? entry.job_title ?? "—"
    );
  }
  return entry.placement ?? entry.job_title ?? "—";
}

function alumniTenure(entry: AlumniDirectoryEntry): string {
  if (entry.source === "record") {
    if (entry.start_year && entry.end_year) {
      return `${entry.start_year}–${entry.end_year}`;
    }
    if (entry.start_year) return `From ${entry.start_year}`;
    if (entry.end_year) return `Until ${entry.end_year}`;
    if (entry.start_date || entry.termination_date) {
      const start = entry.start_date ?? "?";
      const end = entry.termination_date ?? "?";
      return `${start} – ${end}`;
    }
    return "—";
  }

  if (entry.start_date && entry.termination_date) {
    return `${entry.start_date.slice(0, 4)}–${entry.termination_date.slice(0, 4)}`;
  }
  if (entry.start_date) return `From ${entry.start_date.slice(0, 4)}`;
  if (entry.termination_date) {
    return `Until ${entry.termination_date.slice(0, 4)}`;
  }
  return "—";
}

function sourceBadge(entry: AlumniDirectoryEntry) {
  if (entry.source === "profile") {
    return (
      <Badge
        variant="outline"
        className="rounded-md border-transparent bg-secondary font-normal"
      >
        Offboarded
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-md border-transparent bg-[color-mix(in_srgb,#55A8FD_10%,white)] font-normal text-[#2563EB]"
    >
      Record
    </Badge>
  );
}

function entryHref(entry: AlumniDirectoryEntry): string {
  return entry.source === "profile"
    ? `/admin/employees/${entry.id}`
    : `/admin/alumni/records/${entry.id}`;
}

export function AlumniList({ alumni }: { alumni: AlumniDirectoryEntry[] }) {
  const router = useRouter();

  if (alumni.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <p className="text-sm font-medium tracking-tight">No alumni yet</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Offboard from an employee profile, or add someone without a JA
            account.
          </p>
          <Link href="/admin/alumni/new" className={cn(buttonVariants(), "mt-6")}>
            Add alumni
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_8.5rem_7rem] gap-4 border-b border-border px-4 py-3 text-left text-xs text-muted-foreground md:grid">
        <span>Full name</span>
        <span>Where they worked</span>
        <span>Contact</span>
        <span>Tenure</span>
        <span>Type</span>
        <span>Actions</span>
      </div>

      <ul className="divide-y divide-border">
        {alumni.map((entry) => {
          const name = alumniName(entry);
          const href = entryHref(entry);

          return (
            <li
              key={`${entry.source}-${entry.id}`}
              className="grid gap-3 px-4 py-3.5 text-left md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_8.5rem_7rem] md:items-center md:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  name={name}
                  src={entry.source === "profile" ? entry.avatar_url : null}
                  gender={
                    entry.source === "profile"
                      ? normalizeGender(entry.gender)
                      : null
                  }
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.source === "profile"
                      ? (entry.job_title ?? "Former employee")
                      : (entry.job_title ?? "Alumni record")}
                  </p>
                </div>
              </div>

              <p className="truncate text-sm text-muted-foreground">
                {alumniPlacement(entry)}
              </p>

              <p className="truncate text-sm text-muted-foreground">
                {alumniEmail(entry)}
              </p>

              <p className="truncate text-sm tabular-nums text-muted-foreground">
                {alumniTenure(entry)}
              </p>

              <div>{sourceBadge(entry)}</div>

              <div className="flex items-center justify-start gap-1">
                <Link
                  href={href}
                  aria-label={`View ${name}`}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  )}
                >
                  <Eye />
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    )}
                    aria-label={`More actions for ${name}`}
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-40">
                    <DropdownMenuItem onClick={() => router.push(href)}>
                      Open
                    </DropdownMenuItem>
                    {entry.source === "record" ? (
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/admin/alumni/records/${entry.id}/edit`)
                        }
                      >
                        Edit record
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Showing {alumni.length} {alumni.length === 1 ? "person" : "people"}
      </div>
    </div>
  );
}
