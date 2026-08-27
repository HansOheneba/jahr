"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import type { AlumniRecord, AlumniRecordInput } from "@/lib/alumni/types";
import { isOrgAdmin } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export interface AlumniActionResult {
  error?: string;
  success?: boolean;
  recordId?: string;
}

function clean(value: string): string {
  return value.trim();
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const year = Number(trimmed);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return null;
  }
  return year;
}

function mapRecord(row: {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  personal_email: string | null;
  start_year: number | null;
  end_year: number | null;
  start_date: string | null;
  termination_date: string | null;
  business_unit_id: string | null;
  placement: string | null;
  job_title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}, businessUnitName?: string | null): AlumniRecord {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    preferred_name: row.preferred_name,
    email: row.email,
    phone: row.phone,
    personal_email: row.personal_email,
    start_year: row.start_year,
    end_year: row.end_year,
    start_date: row.start_date,
    termination_date: row.termination_date,
    business_unit_id: row.business_unit_id,
    business_unit_name: businessUnitName ?? null,
    placement: row.placement,
    job_title: row.job_title,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateInput(input: AlumniRecordInput): {
  error?: string;
  data?: {
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    email: string | null;
    phone: string | null;
    personal_email: string | null;
    start_year: number | null;
    end_year: number | null;
    start_date: string | null;
    termination_date: string | null;
    business_unit_id: string | null;
    placement: string | null;
    job_title: string | null;
    notes: string | null;
  };
} {
  const firstName = clean(input.firstName);
  const lastName = clean(input.lastName);

  if (!firstName || !lastName) {
    return { error: "First name and last name are required." };
  }

  const startYear = parseYear(input.startYear);
  const endYear = parseYear(input.endYear);

  if (input.startYear.trim() && startYear === null) {
    return { error: "Start year must be a valid year." };
  }
  if (input.endYear.trim() && endYear === null) {
    return { error: "End year must be a valid year." };
  }
  if (startYear !== null && endYear !== null && endYear < startYear) {
    return { error: "End year cannot be before start year." };
  }

  return {
    data: {
      first_name: firstName,
      last_name: lastName,
      preferred_name: emptyToNull(input.preferredName),
      email: emptyToNull(input.email),
      phone: emptyToNull(input.phone),
      personal_email: emptyToNull(input.personalEmail),
      start_year: startYear,
      end_year: endYear,
      start_date: emptyToNull(input.startDate),
      termination_date: emptyToNull(input.terminationDate),
      business_unit_id: emptyToNull(input.businessUnitId),
      placement: null,
      job_title: emptyToNull(input.jobTitle),
      notes: emptyToNull(input.notes),
    },
  };
}

function revalidateAlumniPaths(recordId?: string) {
  revalidatePath("/admin/alumni");
  if (recordId) {
    revalidatePath(`/admin/alumni/records/${recordId}`);
    revalidatePath(`/admin/alumni/records/${recordId}/edit`);
  }
}

export async function getAlumniRecord(
  recordId: string,
): Promise<AlumniRecord | null> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("alumni_records")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getAlumniRecord]", error.message);
    return null;
  }

  let businessUnitName: string | null = null;
  if (data.business_unit_id) {
    const { data: unit } = await supabase
      .from("business_units")
      .select("name")
      .eq("id", data.business_unit_id)
      .maybeSingle();
    businessUnitName = unit?.name ?? null;
  }

  return mapRecord(data, businessUnitName);
}

export async function createAlumniRecord(
  input: AlumniRecordInput,
): Promise<AlumniActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return { error: "Only org admins can add alumni records." };
  }

  const validated = validateInput(input);
  if (validated.error || !validated.data) {
    return { error: validated.error ?? "Invalid input." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("alumni_records")
    .insert(validated.data)
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create alumni record." };
  }

  revalidateAlumniPaths(data.id);
  return { success: true, recordId: data.id };
}

export async function updateAlumniRecord(
  recordId: string,
  input: AlumniRecordInput,
): Promise<AlumniActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    return { error: "Only org admins can edit alumni records." };
  }

  const validated = validateInput(input);
  if (validated.error || !validated.data) {
    return { error: validated.error ?? "Invalid input." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("alumni_records")
    .update(validated.data)
    .eq("id", recordId);

  if (error) {
    return { error: error.message };
  }

  revalidateAlumniPaths(recordId);
  return { success: true, recordId };
}
