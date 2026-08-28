import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { getNotificationsForViewer } from "@/lib/notifications/get-for-viewer";

export async function HeaderNotifications() {
  const notifications = await getNotificationsForViewer(30);
  return <NotificationsPanel initialItems={notifications} />;
}
