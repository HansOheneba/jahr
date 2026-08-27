import { notFound, redirect } from "next/navigation";
import { getAlumniRecord } from "@/lib/alumni/actions";
import { AlumniRecordProfile } from "@/components/admin/alumni-record-profile";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isOrgAdmin } from "@/lib/types/database";

export default async function AlumniRecordPage({
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

  return <AlumniRecordProfile record={record} />;
}
