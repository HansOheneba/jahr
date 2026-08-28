import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationsBellSkeleton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-10"
      disabled
      aria-hidden
    >
      <Bell className="size-4" />
    </Button>
  );
}
