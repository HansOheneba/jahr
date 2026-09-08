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
    <div className="flex h-[calc(100svh-3rem-2.5rem)] w-full flex-col gap-4 overflow-hidden">
      <div
        className="relative shrink-0 overflow-hidden rounded-xl border border-border px-5 py-4 sm:px-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, #0070F3 8%, white) 0%, #ffffff 55%, color-mix(in srgb, #F6B93B 6%, white) 100%)",
        }}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-[#0B4FBF] uppercase">
            People
          </p>
          <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
            Organogram
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {isOrgAdmin(profile)
              ? "Reporting structure across JA Group."
              : "Your reporting line."}
          </p>
        </div>
      </div>

      <OrganogramTree roots={roots} />
    </div>
  );
}
