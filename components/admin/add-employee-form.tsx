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
import { createEmployee } from "@/lib/employees/actions";
import {
  APP_ROLE_LABELS,
  displayName,
  type AppRole,
} from "@/lib/types/database";
import type {
  EmployeeCategory,
  EmploymentType,
  WorkType,
} from "@/lib/types/employee";

const ROLE_OPTIONS: AppRole[] = [
  "employee",
  "manager",
  "business_unit_md",
  "hr_admin",
  "coo",
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

export function AddEmployeeForm({ org }: { org: OrgOptions }) {
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
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("Accra");
  const [country, setCountry] = useState("Ghana");
  const [jobTitle, setJobTitle] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [role, setRole] = useState<AppRole>("employee");
  const [employeeCategory, setEmployeeCategory] =
    useState<EmployeeCategory>("employee");
  const [workType, setWorkType] = useState<WorkType>("hybrid");
  const [employmentType, setEmploymentType] =
    useState<EmploymentType>("full_time");
  const [officeLocation, setOfficeLocation] = useState("Accra HQ");
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
        addressLine,
        city,
        country,
        jobTitle,
        employeeNumber,
        role,
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

      <Section title="Ghana statutory IDs">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Ghana Card number"
            value={nationalId}
            onChange={setNationalId}
            required
            placeholder="GHA-XXXXXXXXX-X"
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
          <SelectField
            label="Role"
            value={role}
            onChange={(value) => setRole(value as AppRole)}
            items={ROLE_OPTIONS.map((option) => ({
              value: option,
              label: APP_ROLE_LABELS[option],
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
          <Field
            label="Office location"
            value={officeLocation}
            onChange={setOfficeLocation}
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
