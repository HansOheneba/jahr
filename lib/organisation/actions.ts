"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isOrgAdmin } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export interface OrganisationActionResult {
  error?: string;
  success?: boolean;
}

function revalidateOrganisation() {
  revalidatePath("/admin/organisation");
  revalidatePath("/admin/organisation/[unitId]");
  revalidatePath("/admin/employees", "layout");
  revalidatePath("/admin/alumni");
  revalidatePath("/admin/comms");
  revalidatePath("/organogram");
  revalidatePath("/dashboard");
}

async function requireOrgAdmin(): Promise<OrganisationActionResult | null> {
  if (AUTH_BYPASS) {
    return { error: "Organisation changes are unavailable in preview." };
  }

  const profile = await getCurrentProfile();
  if (!profile || !isOrgAdmin(profile)) {
    return { error: "Only org admins can change the organisation." };
  }

  return null;
}

function normalizeName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function duplicateMessage(kind: "unit" | "department"): OrganisationActionResult {
  return {
    error:
      kind === "unit"
        ? "A business unit with that name already exists."
        : "That department already exists in this unit.",
  };
}

async function countRows(
  table: "departments" | "profiles" | "teams" | "alumni_records",
  column: "business_unit_id" | "department_id",
  id: string,
): Promise<{ count: number } | { error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, id);

  if (error) return { error: error.message };
  return { count: count ?? 0 };
}

export async function createBusinessUnit(input: {
  name: string;
  description: string;
}): Promise<OrganisationActionResult> {
  const denied = await requireOrgAdmin();
  if (denied) return denied;

  const name = normalizeName(input.name);
  if (!name) return { error: "Enter a business unit name." };

  const slug = slugify(name);
  if (!slug) return { error: "Use letters or numbers in the business unit name." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing, error: existingError } = await supabase
    .from("business_units")
    .select("id, name, slug");

  if (existingError) return { error: existingError.message };

  const taken = (existing ?? []).some(
    (unit) =>
      unit.slug === slug || unit.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (taken) return duplicateMessage("unit");

  const { error } = await supabase.from("business_units").insert({
    name,
    slug,
    description: emptyToNull(input.description),
  });

  if (error) {
    if (error.code === "23505") return duplicateMessage("unit");
    return { error: error.message };
  }

  revalidateOrganisation();
  return { success: true };
}

export async function updateBusinessUnit(input: {
  id: string;
  name: string;
  description: string;
}): Promise<OrganisationActionResult> {
  const denied = await requireOrgAdmin();
  if (denied) return denied;

  const name = normalizeName(input.name);
  if (!name) return { error: "Enter a business unit name." };

  const slug = slugify(name);
  if (!slug) return { error: "Use letters or numbers in the business unit name." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: current, error: fetchError } = await supabase
    .from("business_units")
    .select("id, name, slug, description")
    .eq("id", input.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!current) return { error: "Business unit not found." };

  const description = emptyToNull(input.description);
  if (current.name === name && (current.description ?? null) === description) {
    return { success: true };
  }

  const { data: existing, error: existingError } = await supabase
    .from("business_units")
    .select("id, name, slug")
    .neq("id", input.id);

  if (existingError) return { error: existingError.message };

  const taken = (existing ?? []).some(
    (unit) =>
      unit.slug === slug || unit.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (taken) return duplicateMessage("unit");

  const { error } = await supabase
    .from("business_units")
    .update({ name, slug, description })
    .eq("id", input.id);

  if (error) {
    if (error.code === "23505") return duplicateMessage("unit");
    return { error: error.message };
  }

  revalidateOrganisation();
  return { success: true };
}

export async function deleteBusinessUnit(
  id: string,
): Promise<OrganisationActionResult> {
  const denied = await requireOrgAdmin();
  if (denied) return denied;

  const [departments, people, alumni] = await Promise.all([
    countRows("departments", "business_unit_id", id),
    countRows("profiles", "business_unit_id", id),
    countRows("alumni_records", "business_unit_id", id),
  ]);

  if ("error" in departments) return { error: departments.error };
  if ("error" in people) return { error: people.error };
  if ("error" in alumni) return { error: alumni.error };

  if (departments.count > 0) {
    return { error: "Remove departments in this unit first." };
  }
  if (people.count > 0) {
    return { error: "Reassign people in this unit first." };
  }
  if (alumni.count > 0) {
    return { error: "Reassign alumni in this unit first." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from("business_units").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return { error: "This unit is still in use." };
    }
    return { error: error.message };
  }

  revalidateOrganisation();
  return { success: true };
}

export async function createDepartment(input: {
  businessUnitId: string;
  name: string;
}): Promise<OrganisationActionResult> {
  const denied = await requireOrgAdmin();
  if (denied) return denied;

  const name = normalizeName(input.name);
  if (!name) return { error: "Enter a department name." };

  const slug = slugify(name);
  if (!slug) return { error: "Use letters or numbers in the department name." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: unit, error: unitError } = await supabase
    .from("business_units")
    .select("id")
    .eq("id", input.businessUnitId)
    .maybeSingle();

  if (unitError) return { error: unitError.message };
  if (!unit) return { error: "Business unit not found." };

  const { data: existing, error: existingError } = await supabase
    .from("departments")
    .select("id, name, slug")
    .eq("business_unit_id", input.businessUnitId);

  if (existingError) return { error: existingError.message };

  const taken = (existing ?? []).some(
    (department) =>
      department.slug === slug ||
      department.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (taken) return duplicateMessage("department");

  const { error } = await supabase.from("departments").insert({
    business_unit_id: input.businessUnitId,
    name,
    slug,
  });

  if (error) {
    if (error.code === "23505") return duplicateMessage("department");
    return { error: error.message };
  }

  revalidateOrganisation();
  return { success: true };
}

export async function updateDepartment(input: {
  id: string;
  name: string;
}): Promise<OrganisationActionResult> {
  const denied = await requireOrgAdmin();
  if (denied) return denied;

  const name = normalizeName(input.name);
  if (!name) return { error: "Enter a department name." };

  const slug = slugify(name);
  if (!slug) return { error: "Use letters or numbers in the department name." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: current, error: fetchError } = await supabase
    .from("departments")
    .select("id, name, slug, business_unit_id")
    .eq("id", input.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!current) return { error: "Department not found." };
  if (current.name === name) return { success: true };

  const { data: existing, error: existingError } = await supabase
    .from("departments")
    .select("id, name, slug")
    .eq("business_unit_id", current.business_unit_id)
    .neq("id", input.id);

  if (existingError) return { error: existingError.message };

  const taken = (existing ?? []).some(
    (department) =>
      department.slug === slug ||
      department.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (taken) return duplicateMessage("department");

  const { error } = await supabase
    .from("departments")
    .update({ name, slug })
    .eq("id", input.id);

  if (error) {
    if (error.code === "23505") return duplicateMessage("department");
    return { error: error.message };
  }

  revalidateOrganisation();
  return { success: true };
}

export async function deleteDepartment(
  id: string,
): Promise<OrganisationActionResult> {
  const denied = await requireOrgAdmin();
  if (denied) return denied;

  const [teams, people] = await Promise.all([
    countRows("teams", "department_id", id),
    countRows("profiles", "department_id", id),
  ]);

  if ("error" in teams) return { error: teams.error };
  if ("error" in people) return { error: people.error };

  if (teams.count > 0) {
    return { error: "Remove teams in this department first." };
  }
  if (people.count > 0) {
    return { error: "Reassign people in this department first." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from("departments").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return { error: "This department is still in use." };
    }
    return { error: error.message };
  }

  revalidateOrganisation();
  return { success: true };
}
