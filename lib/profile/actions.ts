"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/utils/supabase/server";

export interface ProfileActionResult {
  error?: string;
  success?: boolean;
}

const AVATARS_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function revalidateProfilePaths() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/leave");
  revalidatePath("/approvals");
}

export async function updateProfileSettings(input: {
  firstName: string;
  lastName: string;
  preferredName: string;
  phone: string;
  personalEmail: string;
  addressLine: string;
  city: string;
  country: string;
}): Promise<ProfileActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return { error: "You must be signed in." };
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return { error: "First name and last name are required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      preferred_name: input.preferredName.trim() || null,
      phone: input.phone.trim() || null,
      personal_email: input.personalEmail.trim() || null,
      address_line: input.addressLine.trim() || null,
      city: input.city.trim() || null,
      country: input.country.trim() || "Ghana",
    })
    .eq("id", viewer.id);

  if (error) {
    return { error: error.message };
  }

  revalidateProfilePaths();
  return { success: true };
}

export async function uploadProfilePhoto(
  formData: FormData,
): Promise<ProfileActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return { error: "You must be signed in." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Photos must be 2 MB or smaller." };
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_AVATAR_TYPES.has(mimeType)) {
    return { error: "Use a JPG, PNG, or WebP image." };
  }

  const extension =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const storagePath = `${viewer.id}/avatar.${extension}`;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(storagePath, file, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(storagePath);

  // Cache-bust so the new photo shows immediately.
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", viewer.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateProfilePaths();
  return { success: true };
}

export async function removeProfilePhoto(): Promise<ProfileActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return { error: "You must be signed in." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: listed } = await supabase.storage
    .from(AVATARS_BUCKET)
    .list(viewer.id);

  const paths = (listed ?? []).map((item) => `${viewer.id}/${item.name}`);
  if (paths.length > 0) {
    await supabase.storage.from(AVATARS_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", viewer.id);

  if (error) {
    return { error: error.message };
  }

  revalidateProfilePaths();
  return { success: true };
}
