"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  ensureDefaultPayPackage,
  savePayPackage,
} from "@/lib/payroll/actions";
import { periodKey, recentPayPeriods } from "@/lib/payroll/period";
import { computePayTotals } from "@/lib/payroll/totals";
import {
  DEFAULT_PACKAGE_LINES,
  type PayFrequency,
  type PayLineKind,
  type PayPackage,
  type PayPackageLineInput,
} from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

type EditableLine = PayPackageLineInput & { key: string };

function toEditable(lines: PayPackage["lines"]): EditableLine[] {
  if (lines.length === 0) {
    return DEFAULT_PACKAGE_LINES.map((line, index) => ({
      ...line,
      amount: 0,
      key: `${line.code}-${index}`,
    }));
  }
  return lines.map((line, index) => ({
    kind: line.kind,
    code: line.code,
    label: line.label,
    amount: line.amount,
    sort_order: line.sort_order,
    active: line.active,
    key: line.id || `${line.code}-${index}`,
  }));
}

export function PayPackageForm({
  pack,
}: {
  pack: PayPackage;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [downloadPeriod, setDownloadPeriod] = useState(
    () => periodKey(recentPayPeriods(1)[0].periodStart),
  );

  const details = pack.details;
  const [salary, setSalary] = useState(
    details?.salary !== null && details?.salary !== undefined
      ? String(details.salary)
      : "",
  );
  const [currency, setCurrency] = useState(details?.currency ?? "GHS");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>(
    details?.pay_frequency ?? "monthly",
  );
  const [bankName, setBankName] = useState(details?.bank_name ?? "");
  const [bankBranch, setBankBranch] = useState(details?.bank_branch ?? "");
  const [accountName, setAccountName] = useState(details?.account_name ?? "");
  const [accountNumber, setAccountNumber] = useState(
    details?.account_number ?? "",
  );
  const [ssnitNumber, setSsnitNumber] = useState(
    pack.employee.ssnit_number ?? "",
  );
  const [tinNumber, setTinNumber] = useState(pack.employee.tin_number ?? "");
  const [nationalId, setNationalId] = useState(
    pack.employee.national_id ?? "",
  );
  const [lines, setLines] = useState<EditableLine[]>(() =>
    toEditable(pack.lines),
  );

  const periods = useMemo(() => recentPayPeriods(12), []);
  const totals = useMemo(() => computePayTotals(lines), [lines]);

  function updateLine(key: string, patch: Partial<EditableLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine(kind: PayLineKind) {
    const code = `custom_${kind}_${Date.now()}`;
    setLines((current) => [
      ...current,
      {
        key: code,
        kind,
        code,
        label: kind === "earning" ? "Allowance" : "Deduction",
        amount: 0,
        sort_order: (current.length + 1) * 10,
        active: true,
      },
    ]);
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function handleSave() {
    setError(null);
    const salaryNumber = salary.trim() === "" ? null : Number(salary);
    if (salaryNumber !== null && Number.isNaN(salaryNumber)) {
      setError("Salary must be a number.");
      return;
    }

    startTransition(async () => {
      if (pack.lines.length === 0) {
        await ensureDefaultPayPackage(pack.employee.id);
      }

      const syncedLines = lines.map((line) => {
        if (line.code === "basic" && salaryNumber !== null) {
          return { ...line, amount: salaryNumber };
        }
        return line;
      });

      const result = await savePayPackage({
        employeeId: pack.employee.id,
        salary: salaryNumber,
        currency,
        payFrequency,
        bankName,
        bankBranch,
        accountName,
        accountNumber,
        paymentMethod: details?.payment_method ?? "bank_transfer",
        ssnitNumber,
        tinNumber,
        nationalId,
        lines: syncedLines.map(({ key: _key, ...line }) => line),
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Employee">
          <p className="text-sm font-medium">{pack.employee.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {pack.employee.job_title ?? "No title"}
            {pack.employee.department_name
              ? ` · ${pack.employee.department_name}`
              : ""}
          </p>
        </Field>
        <Field label="Payroll / employee no.">
          <p className="text-sm font-medium">
            {pack.employee.employee_number ?? "-"}
          </p>
        </Field>
        <Field label="Headline salary">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Currency">
          <Input
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          />
        </Field>
        <Field label="Pay frequency">
          <Select
            value={payFrequency}
            onValueChange={(value) => {
              if (value) setPayFrequency(value as PayFrequency);
            }}
            items={[
              { value: "monthly", label: "Monthly" },
              { value: "weekly", label: "Weekly" },
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="SSNIT no.">
          <Input
            value={ssnitNumber}
            onChange={(event) => setSsnitNumber(event.target.value)}
          />
        </Field>
        <Field label="TIN no.">
          <Input
            value={tinNumber}
            onChange={(event) => setTinNumber(event.target.value)}
          />
        </Field>
        <Field label="National ID no.">
          <Input
            value={nationalId}
            onChange={(event) => setNationalId(event.target.value)}
          />
        </Field>
        <Field label="Bank name">
          <Input
            value={bankName}
            onChange={(event) => setBankName(event.target.value)}
          />
        </Field>
        <Field label="Bank branch">
          <Input
            value={bankBranch}
            onChange={(event) => setBankBranch(event.target.value)}
          />
        </Field>
        <Field label="Account name">
          <Input
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
          />
        </Field>
        <Field label="Account number">
          <Input
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
          />
        </Field>
      </div>

      <LineEditor
        title="Earnings"
        kind="earning"
        lines={lines.filter((line) => line.kind === "earning")}
        currency={currency}
        onChange={updateLine}
        onAdd={() => addLine("earning")}
        onRemove={removeLine}
      />
      <LineEditor
        title="Deductions"
        kind="deduction"
        lines={lines.filter((line) => line.kind === "deduction")}
        currency={currency}
        onChange={updateLine}
        onAdd={() => addLine("deduction")}
        onRemove={removeLine}
      />
      <LineEditor
        title="Employer contributions"
        kind="employer_contribution"
        lines={lines.filter((line) => line.kind === "employer_contribution")}
        currency={currency}
        onChange={updateLine}
        onAdd={() => addLine("employer_contribution")}
        onRemove={removeLine}
      />

      <div className="grid gap-3 rounded-xl border border-border bg-card p-6 sm:grid-cols-3">
        <Summary label="Gross pay" value={totals.grossPay} currency={currency} />
        <Summary
          label="Total deductions"
          value={totals.totalDeductions}
          currency={currency}
        />
        <Summary label="Net pay" value={totals.netPay} currency={currency} strong />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={downloadPeriod}
            onValueChange={(value) => {
              if (value) setDownloadPeriod(value);
            }}
            items={periods.map((period) => ({
              value: periodKey(period.periodStart),
              label: period.periodLabel,
            }))}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem
                  key={period.periodStart}
                  value={periodKey(period.periodStart)}
                >
                  {period.periodLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a
            href={`/api/payslips/download?employeeId=${encodeURIComponent(pack.employee.id)}&period=${encodeURIComponent(downloadPeriod)}`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            <Download className="size-4" />
            Download PDF
          </a>
        </div>

        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? <Spinner /> : null}
          Save package
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Summary({
  label,
  value,
  currency,
  strong,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm tabular-nums",
          strong ? "text-base font-semibold" : "font-medium",
        )}
      >
        {currency}{" "}
        {value.toLocaleString("en-GH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
    </div>
  );
}

function LineEditor({
  title,
  kind,
  lines,
  currency,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  kind: PayLineKind;
  lines: EditableLine[];
  currency: string;
  onChange: (key: string, patch: Partial<EditableLine>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Amounts in {currency}. Inactive lines are hidden on the payslip.
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onAdd}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {kind.replace("_", " ")} lines.</p>
      ) : (
        <div className="space-y-2">
          {lines.map((line) => (
            <div
              key={line.key}
              className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_120px_auto_auto] sm:items-end"
            >
              <Field label="Label">
                <Input
                  value={line.label}
                  onChange={(event) =>
                    onChange(line.key, { label: event.target.value })
                  }
                />
              </Field>
              <Field label="Code">
                <Input
                  value={line.code}
                  onChange={(event) =>
                    onChange(line.key, { code: event.target.value })
                  }
                />
              </Field>
              <Field label="Amount">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={String(line.amount)}
                  onChange={(event) =>
                    onChange(line.key, {
                      amount: Number(event.target.value) || 0,
                    })
                  }
                />
              </Field>
              <label className="flex h-10 items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={line.active}
                  onChange={(event) =>
                    onChange(line.key, { active: event.target.checked })
                  }
                  className="size-4 rounded border-border"
                />
                Active
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onRemove(line.key)}
                aria-label={`Remove ${line.label}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
