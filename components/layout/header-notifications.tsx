import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { getNotificationsForViewer } from "@/lib/notifications/get-for-viewer";

/**
 * Streams the notification feed so a slow announcements query never blocks the
 * app shell. Failures degrade to an empty bell instead of taking down the
 * header, which the app layout renders outside any error boundary.
 */
export async function HeaderNotifications() {
  try {
    const notifications = await getNotificationsForViewer(30);
    return <NotificationsPanel initialItems={notifications} />;
  } catch (error) {
    console.error("[header] notifications", error);
    return <NotificationsPanel initialItems={[]} />;
  }
}
