import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { HeaderNotifications } from "@/components/layout/header-notifications";
import { NotificationsBellSkeleton } from "@/components/layout/notifications-bell-skeleton";
import { SIGN_OUT_PATH } from "@/lib/auth/routes";
import { getCurrentProfile } from "@/lib/auth/get-profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    // A JWT exists but the profile row can't load. Redirecting to /login here
    // would loop: the proxy sees the still-valid cookie and sends us back.
    // The sign-out route clears the cookie first, which ends the bounce.
    redirect(SIGN_OUT_PATH);
  }

  return (
    <div className="flex min-h-full bg-background">
      <div className="hidden shrink-0 md:block">
        <div className="sticky top-0 h-svh overflow-hidden">
          <AppSidebar profile={profile} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          profile={profile}
          notifications={
            <Suspense fallback={<NotificationsBellSkeleton />}>
              <HeaderNotifications />
            </Suspense>
          }
        />
        <main className="flex-1 px-4 py-5 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
