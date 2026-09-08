import { redirect } from "next/navigation";
import { SupportPageView } from "@/components/support/support-page-view";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { SIGN_OUT_PATH } from "@/lib/auth/routes";
import { getOwnSupportRequests } from "@/lib/support/get-requests";

export default async function SupportPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(SIGN_OUT_PATH);
  }

  const requests = await getOwnSupportRequests(profile.id);

  return <SupportPageView requests={requests} />;
}
