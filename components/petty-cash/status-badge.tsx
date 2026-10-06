import { Badge } from "@/components/ui/badge";
import { TRANSACTION_STATUS_LABELS } from "@/lib/petty-cash/labels";
import type { TransactionStatus } from "@/lib/petty-cash/money";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<TransactionStatus, string> = {
  posted: "border-transparent bg-[#E7F6EF] text-[#166534]",
  approved: "border-transparent bg-[#E7F6EF] text-[#166534]",
  pending_approval: "border-transparent bg-[#FFF6E0] text-[#92600A]",
  rejected: "border-transparent bg-destructive/10 text-destructive",
  voided: "border-transparent bg-destructive/10 text-destructive",
  draft: "border-transparent bg-secondary text-muted-foreground",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_CLASS[status])}>
      {TRANSACTION_STATUS_LABELS[status]}
    </Badge>
  );
}
