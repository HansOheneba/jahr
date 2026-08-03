import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/utils/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    // Break login↔dashboard bounce if a JWT exists but the profile row can't load.
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.signOut();
    }
    redirect("/login");
  }

  return (
    <div className="flex min-h-full bg-background">
      <div className="hidden md:block">
        <div className="sticky top-0 h-svh">
          <AppSidebar profile={profile} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader profile={profile} />
        <main className="flex-1 px-4 py-5 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
