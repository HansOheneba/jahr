import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AlumniList } from "@/components/admin/alumni-list";
import { buttonVariants } from "@/components/ui/button";
import { getAlumniDirectory } from "@/lib/alumni/get-alumni-directory";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  canViewPeopleDirectory,
  isOrgAdmin,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function AlumniAdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !canViewPeopleDirectory(profile)) {
    redirect("/dashboard");
  }

  const alumni = isOrgAdmin(profile) ? await getAlumniDirectory() : [];
  const canManage = isOrgAdmin(profile);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Alumni</h1>
          <p className="text-sm text-muted-foreground">
            Offboard from an employee profile, or add someone without a JA
            account.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/admin/alumni/new"
            className={cn(buttonVariants(), "gap-1.5")}
          >
            <Plus className="size-4" />
            Add alumni
          </Link>
        ) : null}
      </div>

      {canManage ? (
        <AlumniList alumni={alumni} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Only org admins can manage alumni records.
        </p>
      )}
    </div>
  );
}
