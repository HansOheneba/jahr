import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { PayslipLine, PayslipSnapshot } from "@/lib/payroll/types";
import { formatMoney } from "@/lib/payroll/totals";
import { cn } from "@/lib/utils";

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

function formatGeneratedAt(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function LineSection({
  title,
  lines,
  currency,
}: {
  title: string;
  lines: PayslipLine[];
  currency: string;
}) {
  if (lines.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border">
        <ul className="divide-y divide-border">
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span>{line.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatMoney(line.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PayrollRegisterDetail({
  snapshot,
}: {
  snapshot: PayslipSnapshot;
}) {
  const context = snapshot.snapshot_context;
  const earnings = snapshot.lines.filter((line) => line.kind === "earning");
  const deductions = snapshot.lines.filter((line) => line.kind === "deduction");
  const employer = snapshot.lines.filter(
    (line) => line.kind === "employer_contribution",
  );

  const employeeName = context?.full_name ?? "Employee";
  const periodRange = `${formatDate(snapshot.period_start)} – ${formatDate(snapshot.period_end)}`;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-3">
        <Link
          href="/admin/payroll/register"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0 hover:bg-transparent",
          )}
        >
          <ArrowLeft className="size-4" />
          Payslip register
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-medium tracking-tight">
                {snapshot.period_label}
              </h1>
              {snapshot.reference ? (
                <Badge
                  variant="outline"
                  className="rounded-md font-mono text-[11px] font-normal"
                >
                  {snapshot.reference}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {employeeName} · {periodRange}
            </p>
            <p className="text-xs text-muted-foreground">
              Generated {formatGeneratedAt(snapshot.generated_at)}
            </p>
          </div>

          <a
            href={`/api/payslips/${snapshot.id}/pdf`}
            className={cn(buttonVariants(), "gap-1.5")}
          >
            <Download className="size-4" />
            Download PDF
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Gross pay"
          value={formatMoney(snapshot.gross_pay, snapshot.currency)}
        />
        <SummaryCard
          label="Deductions"
          value={formatMoney(snapshot.total_deductions, snapshot.currency)}
        />
        <SummaryCard
          label="Net pay"
          value={formatMoney(snapshot.net_pay, snapshot.currency)}
          emphasis
        />
      </div>

      {context ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium">Frozen employee details</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Captured when this payslip was first generated.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" value={context.full_name} />
            <Field label="Payroll no." value={context.employee_number} />
            <Field label="Job title" value={context.job_title} />
            <Field label="Department" value={context.department_name} />
            <Field label="Paying entity" value={context.legal_entity_paying} />
            <Field label="SSNIT no." value={context.ssnit_number} />
            <Field label="TIN no." value={context.tin_number} />
            <Field label="National ID" value={context.national_id} />
            <Field label="Bank" value={context.bank_name} />
            <Field label="Branch" value={context.bank_branch} />
            <Field label="Account no." value={context.account_number} />
            <Field label="Account name" value={context.account_name} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6">
        <LineSection title="Earnings" lines={earnings} currency={snapshot.currency} />
        <LineSection
          title="Deductions"
          lines={deductions}
          currency={snapshot.currency}
        />
        <LineSection
          title="Employer contributions"
          lines={employer}
          currency={snapshot.currency}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/payroll/${snapshot.employee_id}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Open pay package
        </Link>
        <Link
          href={`/admin/employees/${snapshot.employee_id}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Open employee profile
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 tabular-nums",
          emphasis ? "text-lg font-medium" : "text-sm font-medium",
        )}
      >
        {value}
      </p>
    </div>
  );
}
