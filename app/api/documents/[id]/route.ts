import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createDocumentSignedUrl } from "@/lib/documents/storage";
import { isOrgAdmin } from "@/lib/types/database";
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
    return NextResponse.json({ error: "Document id is required." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, employee_id, storage_path, file_name, file_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (
    document.employee_id !== viewer.id &&
    !isOrgAdmin(viewer)
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (document.storage_path) {
    const signedUrl = await createDocumentSignedUrl(
      supabase,
      document.storage_path,
    );
    if (!signedUrl) {
      return NextResponse.json(
        { error: "Could not open this file." },
        { status: 502 },
      );
    }
    return NextResponse.redirect(signedUrl);
  }

  if (document.file_url) {
    return NextResponse.redirect(document.file_url);
  }

  return NextResponse.json({ error: "No file on this document." }, { status: 404 });
}
