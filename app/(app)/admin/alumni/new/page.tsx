import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AlumniRecordForm } from "@/components/admin/alumni-record-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isOrgAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function NewAlumniRecordPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
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
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Add alumni</h1>
          <p className="text-sm text-muted-foreground">
            Capture someone who has left JA Group. Only a name is required —
            add contact details and tenure when you have them.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <AlumniRecordForm />
      </div>
    </div>
  );
}
