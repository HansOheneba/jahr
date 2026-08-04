"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
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
import {
  IMMIGRATION_STATUSES,
  IMMIGRATION_STATUS_LABELS,
} from "@/lib/employees/immigration";
import { OFFICE_LOCATIONS } from "@/lib/employees/office-locations";
import { updateEmployee } from "@/lib/employees/actions";
import {
  canAssignTag,
  PERMISSION_TAG_LABELS,
  PERMISSION_TAG_SLUGS,
  type PermissionTagSlug,
} from "@/lib/auth/permissions";
import {
  displayName,
  type EmploymentStatus,
  type ProfileWithOrg,
} from "@/lib/types/database";
import type {
  EmployeeCategory,
  EmployeeRecord,
  EmploymentType,
  WorkType,
} from "@/lib/types/employee";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: EmploymentStatus[] = [
  "active",
  "inactive",
  "onboarding",
  "terminated",
];

interface OrgOptions {
  businessUnits: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; business_unit_id: string }>;
  managers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    job_title: string | null;
  }>;
}

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  try {
    return parseISO(value);
  } catch {
    return undefined;
  }
}

export function EditEmployeeForm({
  record,
  org,
  viewer,
}: {
  record: EmployeeRecord;
  org: OrgOptions;
  viewer: ProfileWithOrg;
}) {
  const router = useRouter();
  const { profile } = record;
  const primaryContact = record.emergencyContacts.find((c) => c.is_primary)
    ?? record.emergencyContacts[0];

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [preferredName, setPreferredName] = useState(
    profile.preferred_name ?? "",
  );
  const [personalEmail, setPersonalEmail] = useState(
    profile.personal_email ?? "",
  );
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(parseDate(profile.date_of_birth));
  const [gender, setGender] = useState(profile.gender ?? "Male");
  const [nationality, setNationality] = useState(
    profile.nationality ?? "Ghanaian",
  );
  const [nationalId, setNationalId] = useState(profile.national_id ?? "");
  const [ssnitNumber, setSsnitNumber] = useState(profile.ssnit_number ?? "");
  const [tinNumber, setTinNumber] = useState(profile.tin_number ?? "");
  const [immigrationStatus, setImmigrationStatus] = useState(
    profile.immigration_status ?? "",
  );
  const [workPermitNumber, setWorkPermitNumber] = useState(
    profile.work_permit_number ?? "",
  );
  const [workPermitExpiry, setWorkPermitExpiry] = useState(
    parseDate(profile.work_permit_expiry),
  );
  const [addressLine, setAddressLine] = useState(profile.address_line ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [country, setCountry] = useState(profile.country || "Ghana");
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? "");
  const [employeeNumber, setEmployeeNumber] = useState(
    profile.employee_number ?? "",
  );
  const [tags, setTags] = useState<PermissionTagSlug[]>([...profile.tags]);
  const [status, setStatus] = useState<EmploymentStatus>(profile.status);
  const [employeeCategory, setEmployeeCategory] =
    useState<EmployeeCategory>(profile.employee_category);
  const [workType, setWorkType] = useState<WorkType>(profile.work_type);
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    profile.employment_type,
  );
  const [officeLocation, setOfficeLocation] = useState(
    profile.office_location &&
      (OFFICE_LOCATIONS as readonly string[]).includes(profile.office_location)
      ? profile.office_location
      : "Accra HQ",
  );
  const [startDate, setStartDate] = useState(parseDate(profile.start_date));
  const [probationEndDate, setProbationEndDate] = useState(
    parseDate(profile.probation_end_date),
  );
  const [terminationDate, setTerminationDate] = useState(
    parseDate(profile.termination_date),
  );
  const [leavingReason, setLeavingReason] = useState(
    profile.leaving_reason ?? "",
  );
  const [annualLeave, setAnnualLeave] = useState(
    String(profile.annual_leave_entitlement ?? 25),
  );
  const [businessUnitId, setBusinessUnitId] = useState(
    profile.business_unit_id ?? "",
  );
  const [departmentId, setDepartmentId] = useState(
    profile.department_id ?? "",
  );
  const [managerId, setManagerId] = useState(profile.manager_id ?? "");
  const [emergencyName, setEmergencyName] = useState(
    primaryContact?.full_name ?? "",
  );
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    primaryContact?.relationship ?? "",
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    primaryContact?.phone ?? "",
  );

  const departments = useMemo(
    () =>
      org.departments.filter(
        (department) =>
          !businessUnitId || department.business_unit_id === businessUnitId,
      ),
    [businessUnitId, org.departments],
  );

  const managers = useMemo(
    () => org.managers.filter((manager) => manager.id !== profile.id),
    [org.managers, profile.id],
  );

  const assignableTags = useMemo(
    () =>
      PERMISSION_TAG_SLUGS.filter(
        (slug) => canAssignTag(viewer, slug) || tags.includes(slug),
      ),
    [viewer, tags],
  );

  function toggleTag(slug: PermissionTagSlug) {
    if (!canAssignTag(viewer, slug) && !tags.includes(slug)) return;
    if (tags.includes(slug) && !canAssignTag(viewer, slug)) return;
    setTags((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await updateEmployee({
        employeeId: profile.id,
        firstName,
        lastName,
        preferredName,
        personalEmail,
        phone,
        dateOfBirth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : "",
        gender,
        nationality,
        nationalId,
        ssnitNumber,
        tinNumber,
        immigrationStatus,
        workPermitNumber,
        workPermitExpiry: workPermitExpiry
          ? format(workPermitExpiry, "yyyy-MM-dd")
          : "",
        addressLine,
        city,
        country,
        jobTitle,
        employeeNumber,
        tags,
        status,
        employeeCategory,
        workType,
        employmentType,
        officeLocation,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : "",
        probationEndDate: probationEndDate
          ? format(probationEndDate, "yyyy-MM-dd")
          : "",
        terminationDate: terminationDate
          ? format(terminationDate, "yyyy-MM-dd")
          : "",
        leavingReason,
        annualLeaveEntitlement: Number(annualLeave) || 25,
        businessUnitId,
        departmentId,
        managerId,
        emergencyName,
        emergencyRelationship,
        emergencyPhone,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push(`/admin/employees/${profile.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <Section title="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" value={firstName} onChange={setFirstName} required />
          <Field label="Last name" value={lastName} onChange={setLastName} required />
          <Field label="Preferred name" value={preferredName} onChange={setPreferredName} />
          <div className="space-y-2">
            <Label>Work email</Label>
            <Input value={profile.email} disabled className="h-10" />
          </div>
          <Field
            label="Personal email"
            type="email"
            value={personalEmail}
            onChange={setPersonalEmail}
          />
          <Field label="Phone" value={phone} onChange={setPhone} required />
          <div className="space-y-2">
            <Label>Date of birth</Label>
            <DatePicker
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder="Date of birth"
            />
          </div>
          <SelectField
            label="Gender"
            value={gender}
            onChange={setGender}
            items={[
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
            ]}
          />
          <Field label="Nationality" value={nationality} onChange={setNationality} />
        </div>
      </Section>

      <Section title="IDs & immigration">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Ghana Card number"
            value={nationalId}
            onChange={setNationalId}
            placeholder="GHA-XXXXXXXXX-X"
            hint="Optional — not required for staff outside Ghana."
          />
          <Field
            label="SSNIT number"
            value={ssnitNumber}
            onChange={setSsnitNumber}
            placeholder="C##############"
          />
          <Field
            label="TIN number"
            value={tinNumber}
            onChange={setTinNumber}
            placeholder="P##########"
          />
          <SelectField
            label="Immigration status"
            value={immigrationStatus || "none"}
            onChange={(value) =>
              setImmigrationStatus(value === "none" ? "" : value)
            }
            items={[
              { value: "none", label: "Not set" },
              ...IMMIGRATION_STATUSES.map((statusOption) => ({
                value: statusOption,
                label: IMMIGRATION_STATUS_LABELS[statusOption],
              })),
            ]}
          />
          <Field
            label="Work permit number"
            value={workPermitNumber}
            onChange={setWorkPermitNumber}
          />
          <div className="space-y-2">
            <Label>Work permit expiry</Label>
            <DatePicker
              value={workPermitExpiry}
              onChange={setWorkPermitExpiry}
              placeholder="Expiry date"
            />
          </div>
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              label="Street address"
              value={addressLine}
              onChange={setAddressLine}
            />
          </div>
          <Field label="City" value={city} onChange={setCity} />
          <Field label="Country" value={country} onChange={setCountry} />
        </div>
      </Section>

      <Section title="Employment">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title" value={jobTitle} onChange={setJobTitle} required />
          <Field
            label="Employee number"
            value={employeeNumber}
            onChange={setEmployeeNumber}
          />
          <div className="space-y-2 sm:col-span-2">
            <Label>Permission tags</Label>
            <p className="text-xs text-muted-foreground">
              Empty means a regular employee. Privileges come from tags, not
              job title.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {assignableTags.map((slug) => {
                const selected = tags.includes(slug);
                const locked = selected && !canAssignTag(viewer, slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    disabled={locked}
                    onClick={() => toggleTag(slug)}
                    className={cn(
                      "inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors",
                      selected
                        ? "border-[#0070F3] bg-[color-mix(in_srgb,#0070F3_8%,white)] text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      locked && "opacity-60",
                    )}
                  >
                    {PERMISSION_TAG_LABELS[slug]}
                  </button>
                );
              })}
            </div>
          </div>
          <SelectField
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as EmploymentStatus)}
            items={STATUS_OPTIONS.map((option) => ({
              value: option,
              label: option.charAt(0).toUpperCase() + option.slice(1),
            }))}
          />
          <SelectField
            label="Employee category"
            value={employeeCategory}
            onChange={(value) => setEmployeeCategory(value as EmployeeCategory)}
            items={[
              { value: "employee", label: "Employee" },
              { value: "contractor", label: "Contractor" },
              { value: "intern", label: "Intern" },
            ]}
          />
          <SelectField
            label="Work type"
            value={workType}
            onChange={(value) => setWorkType(value as WorkType)}
            items={[
              { value: "onsite", label: "Onsite" },
              { value: "hybrid", label: "Hybrid" },
              { value: "remote", label: "Remote" },
            ]}
          />
          <SelectField
            label="Employment type"
            value={employmentType}
            onChange={(value) => setEmploymentType(value as EmploymentType)}
            items={[
              { value: "full_time", label: "Full time" },
              { value: "part_time", label: "Part time" },
            ]}
          />
          <SelectField
            label="Office location"
            value={officeLocation}
            onChange={setOfficeLocation}
            items={OFFICE_LOCATIONS.map((location) => ({
              value: location,
              label: location,
            }))}
          />
          <Field
            label="Annual leave days"
            type="number"
            value={annualLeave}
            onChange={setAnnualLeave}
          />
          <div className="space-y-2">
            <Label>Start date</Label>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Start date"
            />
          </div>
          <div className="space-y-2">
            <Label>Probation end date</Label>
            <DatePicker
              value={probationEndDate}
              onChange={setProbationEndDate}
              placeholder="Probation end"
            />
          </div>
          {status === "terminated" ? (
            <>
              <div className="space-y-2">
                <Label>Termination date</Label>
                <DatePicker
                  value={terminationDate}
                  onChange={setTerminationDate}
                  placeholder="Termination date"
                />
              </div>
              <Field
                label="Reason for leaving"
                value={leavingReason}
                onChange={setLeavingReason}
              />
            </>
          ) : null}
          <SelectField
            label="Business unit"
            value={businessUnitId || "none"}
            onChange={(value) => {
              setBusinessUnitId(value === "none" ? "" : value);
              setDepartmentId("");
            }}
            items={[
              { value: "none", label: "None" },
              ...org.businessUnits.map((unit) => ({
                value: unit.id,
                label: unit.name,
              })),
            ]}
          />
          <SelectField
            label="Department"
            value={departmentId || "none"}
            onChange={(value) =>
              setDepartmentId(value === "none" ? "" : value)
            }
            items={[
              { value: "none", label: "None" },
              ...departments.map((department) => ({
                value: department.id,
                label: department.name,
              })),
            ]}
          />
          <div className="sm:col-span-2">
            <SelectField
              label="Reports to"
              value={managerId || "none"}
              onChange={(value) => setManagerId(value === "none" ? "" : value)}
              items={[
                { value: "none", label: "None" },
                ...managers.map((manager) => ({
                  value: manager.id,
                  label: `${displayName(manager)}${manager.job_title ? ` · ${manager.job_title}` : ""}`,
                })),
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Emergency contact">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Full name"
            value={emergencyName}
            onChange={setEmergencyName}
          />
          <Field
            label="Relationship"
            value={emergencyRelationship}
            onChange={setEmergencyRelationship}
          />
          <Field
            label="Phone"
            value={emergencyPhone}
            onChange={setEmergencyPhone}
          />
        </div>
      </Section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push(`/admin/employees/${profile.id}`)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="gap-2"
        >
          {pending ? <Spinner /> : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
        items={items}
      >
        <SelectTrigger id={id} className="h-10 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={`${label}-${item.value || "empty"}`} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
