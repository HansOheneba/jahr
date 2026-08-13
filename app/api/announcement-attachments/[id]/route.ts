import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createAnnouncementAttachmentSignedUrl } from "@/lib/announcements/storage";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Attachment id is required." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: attachment, error } = await supabase
    .from("announcement_attachments")
    .select("id, storage_path, file_name")
    .eq("id", id)
    .maybeSingle();

  if (error || !attachment) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  const signedUrl = await createAnnouncementAttachmentSignedUrl(
    supabase,
    attachment.storage_path,
  );

  if (!signedUrl) {
    return NextResponse.json(
      { error: "Could not open this file." },
      { status: 502 },
    );
  }

  return NextResponse.redirect(signedUrl);
}
