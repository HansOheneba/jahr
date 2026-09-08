"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isReportingCurrency } from "@/lib/payroll/currencies";
import { canManagePayroll } from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

export interface OrgSettingsActionResult {
  error?: string;
  success?: boolean;
}

function revalidateLegalEntityPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/payroll", "layout");
}

async function requirePayrollAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !canManagePayroll(profile)) {
    return {
      error: "Only org admins can manage paying entities." as const,
      profile: null,
    };
  }
  return { error: null, profile };
}

function normalizeEntityName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function duplicateEntityMessage(): OrgSettingsActionResult {
  return { error: "That paying entity already exists." };
}

export async function updateReportingCurrency(
  currency: string,
): Promise<OrgSettingsActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !canManagePayroll(profile)) {
    return { error: "Only org admins can change the reporting currency." };
  }

  if (!isReportingCurrency(currency)) {
    return { error: "Choose a supported reporting currency." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("org_settings")
    .update({
      reporting_currency: currency,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", true);

  if (error) {
    return { error: error.message };
  }

  revalidateLegalEntityPaths();
  return { success: true };
}

export async function createLegalEntity(
  name: string,
): Promise<OrgSettingsActionResult> {
  const auth = await requirePayrollAdmin();
  if (auth.error) return { error: auth.error };

  const trimmed = normalizeEntityName(name);
  if (!trimmed) {
    return { error: "Enter a company name." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("legal_entities").insert({
    name: trimmed,
    created_by: auth.profile.id,
  });

  if (error) {
    if (error.code === "23505") {
      return duplicateEntityMessage();
    }
    return { error: error.message };
  }

  revalidateLegalEntityPaths();
  return { success: true };
}

export async function updateLegalEntity(input: {
  id: string;
  name: string;
}): Promise<OrgSettingsActionResult> {
  const auth = await requirePayrollAdmin();
  if (auth.error) return { error: auth.error };

  const trimmed = normalizeEntityName(input.name);
  if (!trimmed) {
    return { error: "Enter a company name." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: current, error: fetchError } = await supabase
    .from("legal_entities")
    .select("id, name")
    .eq("id", input.id)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!current) {
    return { error: "Paying entity not found." };
  }

  if (current.name === trimmed) {
    return { success: true };
  }

  const { error: updateError } = await supabase
    .from("legal_entities")
    .update({ name: trimmed })
    .eq("id", input.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return duplicateEntityMessage();
    }
    return { error: updateError.message };
  }

  const { error: payDetailsError } = await supabase
    .from("pay_details")
    .update({ legal_entity_paying: trimmed })
    .eq("legal_entity_paying", current.name);

  if (payDetailsError) {
    return { error: payDetailsError.message };
  }

  revalidateLegalEntityPaths();
  return { success: true };
}

export async function deleteLegalEntity(
  id: string,
): Promise<OrgSettingsActionResult> {
  const auth = await requirePayrollAdmin();
  if (auth.error) return { error: auth.error };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: current, error: fetchError } = await supabase
    .from("legal_entities")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!current) {
    return { error: "Paying entity not found." };
  }

  const { count, error: usageError } = await supabase
    .from("pay_details")
    .select("employee_id", { count: "exact", head: true })
    .eq("legal_entity_paying", current.name);

  if (usageError) {
    return { error: usageError.message };
  }

  if ((count ?? 0) > 0) {
    const label = count === 1 ? "pay package uses" : "pay packages use";
    return {
      error: `${count} ${label} this paying entity. Reassign them first.`,
    };
  }

  const { error: deleteError } = await supabase
    .from("legal_entities")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidateLegalEntityPaths();
  return { success: true };
}
