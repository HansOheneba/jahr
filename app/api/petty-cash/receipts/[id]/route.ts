import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canAccessPettyCash } from "@/lib/auth/permissions";
import { PETTY_CASH_BUCKET } from "@/lib/petty-cash/storage";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canAccessPettyCash(viewer)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: attachment, error } = await supabase
    .from("petty_cash_attachments")
    .select("file_name, file_type, storage_key")
    .eq("id", id)
    .maybeSingle();

  if (error || !attachment) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(PETTY_CASH_BUCKET)
    .download(attachment.storage_key as string);

  if (downloadError || !file) {
    return NextResponse.json({ error: "Could not open this receipt." }, { status: 502 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = String(attachment.file_name).replaceAll('"', "");

  return new NextResponse(file, {
    headers: {
      "Content-Type": String(attachment.file_type || "application/octet-stream"),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
