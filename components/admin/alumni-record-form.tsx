"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createAlumniRecord,
  updateAlumniRecord,
} from "@/lib/alumni/actions";
import type { AlumniRecord, AlumniRecordInput } from "@/lib/alumni/types";
import { cn } from "@/lib/utils";

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  try {
    return parseISO(value);
  } catch {
    return undefined;
  }
}

function recordToInput(record: AlumniRecord): AlumniRecordInput {
  return {
    firstName: record.first_name,
    lastName: record.last_name,
    preferredName: record.preferred_name ?? "",
    email: record.email ?? "",
    phone: record.phone ?? "",
    personalEmail: record.personal_email ?? "",
    startYear: record.start_year !== null ? String(record.start_year) : "",
    endYear: record.end_year !== null ? String(record.end_year) : "",
    startDate: record.start_date ?? "",
    terminationDate: record.termination_date ?? "",
    businessUnitId: record.business_unit_id ?? "",
    jobTitle: record.job_title ?? "",
    notes: record.notes ?? "",
  };
}

export function AlumniRecordForm({
  record,
  businessUnits,
}: {
  record?: AlumniRecord;
  businessUnits: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(
    () =>
      Boolean(
        record?.preferred_name ||
          record?.personal_email ||
          record?.start_date ||
          record?.termination_date ||
          record?.job_title ||
          record?.notes,
      ),
  );

  const initial = record ? recordToInput(record) : null;
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [startYear, setStartYear] = useState(initial?.startYear ?? "");
  const [endYear, setEndYear] = useState(initial?.endYear ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(
    initial?.businessUnitId ?? "",
  );
  const [preferredName, setPreferredName] = useState(
    initial?.preferredName ?? "",
  );
  const [personalEmail, setPersonalEmail] = useState(
    initial?.personalEmail ?? "",
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    parseDate(initial?.startDate),
  );
  const [terminationDate, setTerminationDate] = useState<Date | undefined>(
    parseDate(initial?.terminationDate),
  );
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit() {
    setError(null);
    const input: AlumniRecordInput = {
      firstName,
      lastName,
      preferredName,
      email,
      phone,
      personalEmail,
      startYear,
      endYear,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : "",
      terminationDate: terminationDate
        ? format(terminationDate, "yyyy-MM-dd")
        : "",
      businessUnitId,
      jobTitle,
      notes,
    };

    startTransition(async () => {
      const result = record
        ? await updateAlumniRecord(record.id, input)
        : await createAlumniRecord(input);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.recordId) {
        router.push(`/admin/alumni/records/${result.recordId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-4">
        <h2 className="text-sm font-medium">Person</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <Input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name" required>
            <Input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Contact & tenure</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Phone">
            <Input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
            />
          </Field>
          <Field label="Start year">
            <Input
              type="number"
              min={1900}
              max={2100}
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              placeholder="e.g. 2019"
            />
          </Field>
          <Field label="End year">
            <Input
              type="number"
              min={1900}
              max={2100}
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              placeholder="e.g. 2020"
            />
          </Field>
          <Field label="Business unit">
            <Select
              value={businessUnitId || "none"}
              onValueChange={(value) => {
                if (value !== null) {
                  setBusinessUnitId(value === "none" ? "" : value);
                }
              }}
              items={[
                { value: "none", label: "None" },
                ...businessUnits.map((unit) => ({
                  value: unit.id,
                  label: unit.name,
                })),
              ]}
            >
              <SelectTrigger id="alumni-business-unit" className="w-full">
                <SelectValue placeholder="Select business unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {businessUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setShowMore((current) => !current)}
          className="flex w-full items-center justify-between rounded-md border border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/40"
        >
          More details
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              showMore && "rotate-180",
            )}
          />
        </button>

        {showMore ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preferred name">
              <Input
                value={preferredName}
                onChange={(event) => setPreferredName(event.target.value)}
              />
            </Field>
            <Field label="Personal email">
              <Input
                type="email"
                value={personalEmail}
                onChange={(event) => setPersonalEmail(event.target.value)}
              />
            </Field>
            <Field label="Start date">
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Exact start date"
              />
            </Field>
            <Field label="End date">
              <DatePicker
                value={terminationDate}
                onChange={setTerminationDate}
                placeholder="Exact end date"
              />
            </Field>
            <Field label="Job title">
              <Input
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
              />
            </Field>
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={pending}>
          {pending ? <Spinner /> : null}
          {record ? "Save changes" : "Add alumni"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs text-muted-foreground">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}
