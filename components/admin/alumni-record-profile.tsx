import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { AlumniRecord } from "@/lib/alumni/types";
import { displayName } from "@/lib/types/database";
import { cn } from "@/lib/utils";

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatTenure(record: AlumniRecord): string {
  if (record.start_year && record.end_year) {
    return `${record.start_year}–${record.end_year}`;
  }
  if (record.start_year) return `From ${record.start_year}`;
  if (record.end_year) return `Until ${record.end_year}`;
  if (record.start_date || record.termination_date) {
    return `${formatValue(record.start_date)} – ${formatValue(record.termination_date)}`;
  }
  return "—";
}

export function AlumniRecordProfile({ record }: { record: AlumniRecord }) {
  const name = displayName({
    first_name: record.first_name,
    last_name: record.last_name,
    preferred_name: record.preferred_name,
  });

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-4">
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

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-medium tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">
              Alumni record · {formatTenure(record)}
            </p>
          </div>
          <Link
            href={`/admin/alumni/records/${record.id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Email" value={record.email} />
        <Field label="Phone" value={record.phone} />
        <Field label="Personal email" value={record.personal_email} />
        <Field label="Where they worked" value={record.placement} />
        <Field label="Job title" value={record.job_title} />
        <Field label="Tenure" value={formatTenure(record)} />
        <Field label="Start year" value={record.start_year} />
        <Field label="End year" value={record.end_year} />
        <Field label="Start date" value={record.start_date} />
        <Field label="End date" value={record.termination_date} />
        <Field label="Notes" value={record.notes} className="sm:col-span-2 lg:col-span-3" />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{formatValue(value)}</p>
    </div>
  );
}
