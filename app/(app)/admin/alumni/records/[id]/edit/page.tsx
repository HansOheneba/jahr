import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AlumniRecordForm } from "@/components/admin/alumni-record-form";
import { buttonVariants } from "@/components/ui/button";
import { getAlumniRecord } from "@/lib/alumni/actions";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isOrgAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function EditAlumniRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const record = await getAlumniRecord(id);
  if (!record) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="space-y-3">
        <Link
          href={`/admin/alumni/records/${id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0 hover:bg-transparent",
          )}
        >
          <ArrowLeft className="size-4" />
          Alumni record
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Edit alumni</h1>
          <p className="text-sm text-muted-foreground">
            Update contact details, tenure, or notes for this record.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <AlumniRecordForm record={record} />
      </div>
    </div>
  );
}
