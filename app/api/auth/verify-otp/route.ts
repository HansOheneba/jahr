import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  createSessionTokenHash,
  verifyLoginOtpCode,
} from "@/lib/auth/otp";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";

  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof (body as { token: unknown }).token === "string"
      ? (body as { token: string }).token
      : "";

  const verified = await verifyLoginOtpCode(email, token);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status ?? 400 },
    );
  }

  const link = await createSessionTokenHash(email);
  if (!link.ok) {
    return NextResponse.json({ error: link.error }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return (
          request.headers
            .get("cookie")
            ?.split("; ")
            .filter(Boolean)
            .map((cookie) => {
              const [name, ...rest] = cookie.split("=");
              return { name, value: rest.join("=") };
            }) ?? []
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.tokenHash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return response;
}
