"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Download, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { CurrencySelect } from "@/components/admin/currency-select";
import { savePayPackage } from "@/lib/payroll/actions";
import { useAsyncAction } from "@/lib/hooks/use-async-action";
import { periodKey, recentPayPeriods } from "@/lib/payroll/period";
import {
  DEFAULT_CURRENCY,
  getCurrencyOption,
} from "@/lib/payroll/currencies";
import { LEGAL_ENTITIES } from "@/lib/payroll/legal-entities";
import { computePayTotals, formatMoney, sumByKind } from "@/lib/payroll/totals";
import {
  DEFAULT_PACKAGE_LINES,
  type PayFrequency,
  type PayLineKind,
  type PayPackage,
} from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

/** Amounts stay as strings while editing so partial input like "1200." survives. */
interface EditableLine {
  key: string;
  kind: PayLineKind;
  code: string;
  label: string;
  amount: string;
  sort_order: number;
  active: boolean;
}

interface PayDetailsDraft {
  currency: string;
  payFrequency: PayFrequency;
  payingEntity: string;
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountNumber: string;
  ssnitNumber: string;
  tinNumber: string;
  nationalId: string;
}

interface LineSection {
  kind: PayLineKind;
  title: string;
  description: string;
  addLabel: string;
  newLineLabel: string;
  emptyLabel: string;
}

const PAY_FREQUENCY_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "annually", label: "Annually" },
];

const LINE_SECTIONS: LineSection[] = [
  {
    kind: "earning",
    title: "Earnings",
    description: "Basic pay and allowances. These add up to gross pay.",
    addLabel: "Add earning",
    newLineLabel: "Allowance",
    emptyLabel: "No earnings yet.",
  },
  {
    kind: "deduction",
    title: "Deductions",
    description: "Taken off gross pay to reach net pay.",
    addLabel: "Add deduction",
    newLineLabel: "Deduction",
    emptyLabel: "No deductions yet.",
  },
  {
    kind: "employer_contribution",
    title: "Employer contributions",
    description: "Paid by the company. These do not change net pay.",
    addLabel: "Add contribution",
    newLineLabel: "Contribution",
    emptyLabel: "No contributions yet.",
  },
];

/** Keeps new lines grouped after the seeded lines of the same kind. */
const SORT_ORDER_BASE: Record<PayLineKind, number> = {
  earning: 10,
  deduction: 110,
  employer_contribution: 210,
};

const SORT_ORDER_STEP = 10;

function toEditableLines(lines: PayPackage["lines"]): EditableLine[] {
  if (lines.length === 0) {
    return DEFAULT_PACKAGE_LINES.map((line, index) => ({
      ...line,
      amount: "0",
      key: `${line.code}-${index}`,
    }));
  }
  return lines.map((line, index) => ({
    kind: line.kind,
    code: line.code,
    label: line.label,
    amount: String(line.amount),
    sort_order: line.sort_order,
    active: line.active,
    key: line.id || `${line.code}-${index}`,
  }));
}

function toDetailsDraft(pack: PayPackage): PayDetailsDraft {
  const details = pack.details;
  return {
    currency: details?.currency ?? DEFAULT_CURRENCY,
    payFrequency: details?.pay_frequency ?? "monthly",
    payingEntity: details?.legal_entity_paying ?? "",
    bankName: details?.bank_name ?? "",
    bankBranch: details?.bank_branch ?? "",
    accountName: details?.account_name ?? "",
    accountNumber: details?.account_number ?? "",
    ssnitNumber: pack.employee.ssnit_number ?? "",
    tinNumber: pack.employee.tin_number ?? "",
    nationalId: pack.employee.national_id ?? "",
  };
}

function snapshot(details: PayDetailsDraft, lines: EditableLine[]): string {
  return JSON.stringify({ details, lines });
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function nextSortOrder(lines: EditableLine[], kind: PayLineKind): number {
  const base = SORT_ORDER_BASE[kind];
  const highest = lines
    .filter((line) => line.kind === kind)
    .reduce((max, line) => Math.max(max, line.sort_order), base - SORT_ORDER_STEP);
  return highest + SORT_ORDER_STEP;
}

/** Codes are internal identifiers, so they are derived rather than typed by hand. */
function buildLineCode(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "line";
  let code = base;
  let attempt = 2;
  while (taken.has(code)) {
    code = `${base}_${attempt}`;
    attempt += 1;
  }
  return code;
}

export function PayPackageForm({ pack }: { pack: PayPackage }) {
  const { pending, run } = useAsyncAction();
  const [error, setError] = useState<string | null>(null);

  const [details, setDetails] = useState<PayDetailsDraft>(() =>
    toDetailsDraft(pack),
  );
  const [lines, setLines] = useState<EditableLine[]>(() =>
    toEditableLines(pack.lines),
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshot(toDetailsDraft(pack), toEditableLines(pack.lines)),
  );

  const periods = useMemo(() => recentPayPeriods(12), []);
  const [downloadPeriod, setDownloadPeriod] = useState(() =>
    periodKey(periods[0].periodStart),
  );

  const numericLines = useMemo(
    () =>
      lines.map((line) => ({
        kind: line.kind,
        amount: parseAmount(line.amount) ?? 0,
        active: line.active,
      })),
    [lines],
  );
  const totals = useMemo(() => computePayTotals(numericLines), [numericLines]);

  const currency = details.currency;
  const currencySymbol = getCurrencyOption(currency)?.symbol ?? currency;
  const isDirty = snapshot(details, lines) !== savedSnapshot;

  function setField<Key extends keyof PayDetailsDraft>(
    key: Key,
    value: PayDetailsDraft[Key],
  ) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function updateLine(key: string, patch: Partial<EditableLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine(section: LineSection) {
    setLines((current) => {
      const code = buildLineCode(
        section.newLineLabel,
        new Set(current.map((line) => line.code)),
      );
      return [
        ...current,
        {
          key: code,
          kind: section.kind,
          code,
          label: section.newLineLabel,
          amount: "0",
          sort_order: nextSortOrder(current, section.kind),
          active: true,
        },
      ];
    });
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function handleSave() {
    setError(null);

    if (lines.some((line) => line.label.trim() === "")) {
      setError("Every pay line needs a description.");
      return;
    }
    if (lines.some((line) => parseAmount(line.amount) === null)) {
      setError("Amounts must be numbers.");
      return;
    }

    const savedLines = lines.map(({ key: _key, ...line }) => ({
      ...line,
      label: line.label.trim(),
      amount: parseAmount(line.amount) ?? 0,
    }));
    const basicLine = savedLines.find(
      (line) => line.code === "basic" && line.active,
    );
    const nextSnapshot = snapshot(details, lines);

    void run(async () => {
      const result = await savePayPackage({
        employeeId: pack.employee.id,
        salary: basicLine?.amount ?? null,
        currency: details.currency,
        payFrequency: details.payFrequency,
        legalEntityPaying: details.payingEntity,
        bankName: details.bankName,
        bankBranch: details.bankBranch,
        accountName: details.accountName,
        accountNumber: details.accountNumber,
        paymentMethod: pack.details?.payment_method ?? "bank_transfer",
        ssnitNumber: details.ssnitNumber,
        tinNumber: details.tinNumber,
        nationalId: details.nationalId,
        lines: savedLines,
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedSnapshot(nextSnapshot);
      toast.success("Changes saved");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Pay setup</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Currency" htmlFor="pay-currency">
            <CurrencySelect
              id="pay-currency"
              value={currency}
              onValueChange={(value) => setField("currency", value)}
            />
          </Field>
          <Field label="Pay frequency" htmlFor="pay-frequency">
            <Select
              value={details.payFrequency}
              onValueChange={(value) => {
                if (value) setField("payFrequency", value as PayFrequency);
              }}
              items={PAY_FREQUENCY_OPTIONS}
            >
              <SelectTrigger id="pay-frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Paying entity" htmlFor="pay-entity">
            <Select
              value={details.payingEntity ? details.payingEntity : null}
              onValueChange={(value) => {
                if (value) setField("payingEntity", value);
              }}
              items={LEGAL_ENTITIES.map((entity) => ({
                value: entity,
                label: entity,
              }))}
            >
              <SelectTrigger id="pay-entity" className="w-full">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_ENTITIES.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {LINE_SECTIONS.map((section) => {
        const sectionLines = lines.filter((line) => line.kind === section.kind);
        const subtotal = sumByKind(numericLines, section.kind);
        return (
          <Card key={section.kind}>
            <CardHeader className="border-b">
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
              <CardAction className="flex items-center gap-4">
                <span className="hidden text-sm font-medium tabular-nums sm:inline">
                  {formatMoney(subtotal, currency)}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => addLine(section)}
                >
                  <Plus />
                  {section.addLabel}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {sectionLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {section.emptyLabel}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="hidden gap-3 text-xs text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_10rem_6rem_2rem]">
                    <span>Description</span>
                    <span className="text-right">Amount</span>
                    <span>On payslip</span>
                    <span className="sr-only">Remove</span>
                  </div>
                  {sectionLines.map((line) => (
                    <div
                      key={line.key}
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_6rem_2rem] sm:items-center sm:gap-3"
                    >
                      <Input
                        aria-label="Description"
                        value={line.label}
                        onChange={(event) =>
                          updateLine(line.key, { label: event.target.value })
                        }
                        className={cn(!line.active && "text-muted-foreground")}
                      />
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                          {currencySymbol}
                        </span>
                        <Input
                          aria-label={`${line.label} amount`}
                          inputMode="decimal"
                          value={line.amount}
                          onChange={(event) =>
                            updateLine(line.key, { amount: event.target.value })
                          }
                          className="pl-11 text-right tabular-nums"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={line.active}
                          onCheckedChange={(checked) =>
                            updateLine(line.key, { active: checked })
                          }
                          aria-label={`Show ${line.label} on payslip`}
                        />
                        <span className="text-xs text-muted-foreground sm:hidden">
                          On payslip
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeLine(line.key)}
                        aria-label={`Remove ${line.label}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Statutory IDs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="SSNIT number" htmlFor="pay-ssnit">
            <Input
              id="pay-ssnit"
              value={details.ssnitNumber}
              onChange={(event) => setField("ssnitNumber", event.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="TIN" htmlFor="pay-tin">
            <Input
              id="pay-tin"
              value={details.tinNumber}
              onChange={(event) => setField("tinNumber", event.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="National ID" htmlFor="pay-national-id">
            <Input
              id="pay-national-id"
              value={details.nationalId}
              onChange={(event) => setField("nationalId", event.target.value)}
              className="font-mono"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank account</CardTitle>
          <CardDescription>Where the net pay is sent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Account name" htmlFor="pay-account-name">
            <Input
              id="pay-account-name"
              value={details.accountName}
              onChange={(event) => setField("accountName", event.target.value)}
            />
          </Field>
          <Field label="Account number" htmlFor="pay-account-number">
            <Input
              id="pay-account-number"
              value={details.accountNumber}
              onChange={(event) => setField("accountNumber", event.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Bank" htmlFor="pay-bank">
            <Input
              id="pay-bank"
              value={details.bankName}
              onChange={(event) => setField("bankName", event.target.value)}
            />
          </Field>
          <Field label="Branch" htmlFor="pay-branch">
            <Input
              id="pay-branch"
              value={details.bankBranch}
              onChange={(event) => setField("bankBranch", event.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payslip</CardTitle>
          <CardDescription>
            Download a PDF for a month. The first download locks that
            month&rsquo;s figures.
          </CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
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
              <SelectTrigger className="w-40" aria-label="Payslip month">
                <SelectValue />
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
              <Download />
              Download PDF
            </a>
          </CardAction>
        </CardHeader>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-xl bg-card/95 p-4 ring-1 ring-foreground/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Total label="Gross pay" value={totals.grossPay} currency={currency} />
          <Total
            label="Deductions"
            value={totals.totalDeductions}
            currency={currency}
          />
          <Total
            label="Net pay"
            value={totals.netPay}
            currency={currency}
            emphasis
          />
        </div>
        <div className="flex items-center gap-3">
          {isDirty ? (
            <span className="text-xs text-muted-foreground">
              Unsaved changes
            </span>
          ) : null}
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending || !isDirty}
          >
            {pending ? <Spinner /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Total({
  label,
  value,
  currency,
  emphasis,
}: {
  label: string;
  value: number;
  currency: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular-nums",
          emphasis ? "text-base font-semibold" : "text-sm font-medium",
        )}
      >
        {formatMoney(value, currency)}
      </p>
    </div>
  );
}
