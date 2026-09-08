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

  revalidatePath("/admin/settings");
  revalidatePath("/admin/payroll", "layout");
  return { success: true };
}

export async function createLegalEntity(
  name: string,
): Promise<OrgSettingsActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !canManagePayroll(profile)) {
    return { error: "Only org admins can add paying entities." };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Enter a company name." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("legal_entities").insert({
    name: trimmed,
    created_by: profile.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That paying entity already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/payroll", "layout");
  return { success: true };
}
