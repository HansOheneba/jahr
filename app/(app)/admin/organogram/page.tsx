import { redirect } from "next/navigation";
import { OrganogramTree } from "@/components/admin/organogram-tree";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  buildOrganogram,
  getDirectoryEmployees,
} from "@/lib/employees/get-directory";
import {
  canViewPeopleDirectory,
  isOrgAdmin,
} from "@/lib/types/database";

export default async function OrganogramPage() {
  const profile = await getCurrentProfile();

  if (
    !profile ||
    !canViewPeopleDirectory(profile)
  ) {
    redirect("/dashboard");
  }

  const employees = await getDirectoryEmployees({ includeSelf: true });
  const roots = buildOrganogram(employees);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Organogram</h1>
        <p className="text-sm text-muted-foreground">
          {isOrgAdmin(profile)
            ? "Scroll horizontally if the chart is wider than your screen."
            : "Your reporting line - only people who report to you."}
        </p>
      </div>

      <OrganogramTree roots={roots} />
    </div>
  );
}
