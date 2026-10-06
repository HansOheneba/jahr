import { cookies } from "next/headers";
import { canAccessPettyCash } from "@/lib/auth/permissions";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { asMoney, formatPettyCashMoney } from "@/lib/petty-cash/money";
import type { NotificationItem } from "@/lib/notifications/types";
import { createClient } from "@/utils/supabase/server";

/** Pending petty cash work for people who can open the module. */
export async function getPettyCashNotifications(): Promise<NotificationItem[]> {
  try {
    const profile = await getCurrentProfile();
    if (!profile || !canAccessPettyCash(profile)) return [];

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const [transactions, replenishments] = await Promise.all([
      supabase
        .from("petty_cash_transactions")
        .select(
          "id, description, amount, currency, created_at, created_by, transaction_number",
        )
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("petty_cash_replenishments")
        .select("id, requested_amount, requested_at, requested_by, fund_id")
        .eq("status", "pending_approval")
        .order("requested_at", { ascending: false })
        .limit(5),
    ]);

    if (transactions.error || replenishments.error) return [];

    const expenseItems: NotificationItem[] = (transactions.data ?? []).map((row) => {
      const own = row.created_by === profile.id;
      const amount = formatPettyCashMoney(asMoney(row.amount), row.currency as string);
      return {
        id: `petty-cash:${row.id}`,
        kind: "petty_cash",
        unread: true,
        createdAt: row.created_at as string,
        actor: null,
        subject: row.transaction_number as string,
        body: own
          ? `${row.description as string} for ${amount} is waiting for approval.`
          : `${row.description as string} for ${amount} needs approval.`,
        href: `/operations/petty-cash/transactions/${row.id as string}`,
      };
    });

    const replenishmentItems: NotificationItem[] = (replenishments.data ?? []).map(
      (row) => {
        const own = row.requested_by === profile.id;
        return {
          id: `petty-cash-replenishment:${row.id}`,
          kind: "petty_cash" as const,
          unread: true,
          createdAt: row.requested_at as string,
          actor: null,
          subject: "Replenishment",
          body: own
            ? "Your replenishment request is waiting for approval."
            : "A replenishment request needs approval.",
          href: "/operations/petty-cash/replenishments",
        };
      },
    );

    return [...expenseItems, ...replenishmentItems];
  } catch (error) {
    console.error("[petty-cash notifications]", error);
    return [];
  }
}
