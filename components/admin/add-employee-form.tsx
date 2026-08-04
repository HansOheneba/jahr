"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
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
  canAssignTag,
  PERMISSION_TAG_LABELS,
  PERMISSION_TAG_SLUGS,
  type PermissionTagSlug,
} from "@/lib/auth/permissions";
import {
  IMMIGRATION_STATUSES,
  IMMIGRATION_STATUS_LABELS,
} from "@/lib/employees/immigration";
import { OFFICE_LOCATIONS } from "@/lib/employees/office-locations";
import { createEmployee } from "@/lib/employees/actions";
import { displayName, type ProfileWithOrg } from "@/lib/types/database";
import type {
  EmployeeCategory,
  EmploymentType,
  WorkType,
} from "@/lib/types/employee";
import { cn } from "@/lib/utils";

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

export function AddEmployeeForm({
  org,
  viewer,
}: {
  org: OrgOptions;
  viewer: ProfileWithOrg;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [gender, setGender] = useState("Male");
  const [nationality, setNationality] = useState("Ghanaian");
  const [nationalId, setNationalId] = useState("");
  const [ssnitNumber, setSsnitNumber] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [immigrationStatus, setImmigrationStatus] = useState("");
  const [workPermitNumber, setWorkPermitNumber] = useState("");
  const [workPermitExpiry, setWorkPermitExpiry] = useState<Date | undefined>();
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("Accra");
  const [country, setCountry] = useState("Ghana");
  const [jobTitle, setJobTitle] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [tags, setTags] = useState<PermissionTagSlug[]>([]);
  const [employeeCategory, setEmployeeCategory] =
    useState<EmployeeCategory>("employee");
  const [workType, setWorkType] = useState<WorkType>("hybrid");
  const [employmentType, setEmploymentType] =
    useState<EmploymentType>("full_time");
  const [officeLocation, setOfficeLocation] = useState<string>("Accra HQ");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [probationEndDate, setProbationEndDate] = useState<Date | undefined>();
  const [annualLeave, setAnnualLeave] = useState("25");
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const departments = useMemo(
    () =>
      org.departments.filter(
        (department) =>
          !businessUnitId || department.business_unit_id === businessUnitId,
      ),
    [businessUnitId, org.departments],
  );

  const assignableTags = useMemo(
    () => PERMISSION_TAG_SLUGS.filter((slug) => canAssignTag(viewer, slug)),
    [viewer],
  );

  function toggleTag(slug: PermissionTagSlug) {
    setTags((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createEmployee({
        firstName,
        lastName,
        preferredName,
        email,
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
        employeeCategory,
        workType,
        employmentType,
        officeLocation,
        startDate: startDate ? format(startDate, "yyyy-MM-dd") : "",
        probationEndDate: probationEndDate
          ? format(probationEndDate, "yyyy-MM-dd")
          : "",
        annualLeaveEntitlement: Number(annualLeave) || 25,
        businessUnitId,
        departmentId,
        managerId,
        emergencyName,
        emergencyRelationship,
        emergencyPhone,
      });

      if (result.error || !result.employeeId) {
        setError(result.error ?? "Could not create employee.");
        return;
      }

      router.push(`/admin/employees/${result.employeeId}`);
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
          <Field label="Work email" type="email" value={email} onChange={setEmail} required />
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
            label="National ID number"
            value={nationalId}
            onChange={setNationalId}
            placeholder="National ID / passport ID"
            hint="Optional. Use the ID number for their country of work."
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
              ...IMMIGRATION_STATUSES.map((status) => ({
                value: status,
                label: IMMIGRATION_STATUS_LABELS[status],
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
            hint="Leave blank to auto-assign (JA-0004…)."
          />
          <div className="space-y-2 sm:col-span-2">
            <Label>Permission tags</Label>
            <p className="text-xs text-muted-foreground">
              Leave empty for a regular employee. Tags grant privileges
              independently of job title.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {assignableTags.map((slug) => {
                const selected = tags.includes(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleTag(slug)}
                    className={cn(
                      "inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors",
                      selected
                        ? "border-[#0070F3] bg-[color-mix(in_srgb,#0070F3_8%,white)] text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    {PERMISSION_TAG_LABELS[slug]}
                  </button>
                );
              })}
            </div>
          </div>
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
                ...org.managers.map((manager) => ({
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
          onClick={() => router.push("/admin/employees")}
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
          Add employee
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
