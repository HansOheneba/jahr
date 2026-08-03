import { redirect } from "next/navigation";
import { DevicesManager } from "@/components/admin/devices-manager";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  getAssignableEmployees,
  getDevices,
} from "@/lib/devices/get-devices";
import { isOrgAdmin } from "@/lib/types/database";

export default async function DevicesAdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile.role)) {
    redirect("/dashboard");
  }

  const [devices, employees] = await Promise.all([
    getDevices(),
    getAssignableEmployees(),
  ]);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Devices</h1>
        <p className="text-sm text-muted-foreground">
          Track company hardware, assignments, and possession history.
        </p>
      </div>

      <DevicesManager devices={devices} employees={employees} />
    </div>
  );
}
