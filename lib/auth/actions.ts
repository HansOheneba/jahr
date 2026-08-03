"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_BYPASS } from "@/lib/auth/config";
import {
  createSessionTokenHash,
  issueLoginOtp,
  verifyLoginOtpCode,
} from "@/lib/auth/otp";
import { createClient } from "@/utils/supabase/server";

export type AuthActionState = {
  error: string | null;
  success: boolean;
};

export async function sendLoginOtp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const result = await issueLoginOtp(email);

  if (!result.ok) {
    return { error: result.error, success: false };
  }

  return { error: null, success: true };
}

export async function verifyLoginOtp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "").trim();

  const verified = await verifyLoginOtpCode(email, token);
  if (!verified.ok) {
    return { error: verified.error, success: false };
  }

  const link = await createSessionTokenHash(email);
  if (!link.ok) {
    return { error: link.error, success: false };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Exchange on the cookie-bound client so Set-Cookie lands on the action response.
  const { error } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.tokenHash,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  // Client shows a branded entry transition, then navigates to the dashboard.
  return { error: null, success: true };
}

export async function signOut(): Promise<void> {
  if (AUTH_BYPASS) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}
