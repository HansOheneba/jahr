import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AlumniRecordForm } from "@/components/admin/alumni-record-form";
import {
  FormPageCard,
  FormPageShell,
} from "@/components/layout/form-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { getOrgOptionsForHire } from "@/lib/employees/actions";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isOrgAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function NewAlumniRecordPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const { businessUnits } = await getOrgOptionsForHire();

  return (
    <FormPageShell>
      <div className="space-y-3">
        <Link
          href="/admin/alumni"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0 hover:bg-transparent",
          )}
        >
          <ArrowLeft className="size-4" />
          Alumni
        </Link>
        <h1 className="text-xl font-medium tracking-tight">Add alumni</h1>
      </div>

      <FormPageCard>
        <AlumniRecordForm businessUnits={businessUnits} />
      </FormPageCard>
    </FormPageShell>
  );
}
