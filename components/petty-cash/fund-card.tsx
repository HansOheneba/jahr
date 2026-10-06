import Link from "next/link";
import { EditFundButton } from "@/components/petty-cash/toolbar";
import { formatPettyCashMoney, floatFillPercent } from "@/lib/petty-cash/money";
import type {
  DepartmentOption,
  PettyCashFund,
  PettyCashPerson,
  PettyCashSettings,
} from "@/lib/petty-cash/types";
import { cn } from "@/lib/utils";

export function FundCard({
  fund,
  selected,
  canManage,
  settings,
  people,
  departments,
  viewerId,
}: {
  fund: PettyCashFund;
  selected: boolean;
  canManage: boolean;
  settings: PettyCashSettings;
  people: PettyCashPerson[];
  departments: DepartmentOption[];
  viewerId: string;
}) {
  const fill = floatFillPercent(fund.availableBalance, fund.targetBalance);
  const custodian =
    fund.custodians.length === 0
      ? "Unassigned"
      : fund.custodians.map((person) => person.name).join(", ");

  return (
    <div className="relative">
      <Link
        href={selected ? "/operations/petty-cash" : `/operations/petty-cash?fund=${fund.id}`}
        className={cn(
          "block rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:bg-muted/30",
          selected && "border-foreground",
        )}
      >
        <p className="truncate pr-16 text-sm font-medium">{fund.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{custodian}</p>
        <p className="mt-4 text-xl font-medium tracking-tight tabular-nums">
          {formatPettyCashMoney(fund.availableBalance, fund.currency)}
        </p>
        <div
          className="mt-4 h-1.5 rounded-full bg-secondary"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fill)}
          aria-label="Current balance compared with target float"
        >
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${fill}%`,
              backgroundColor: fund.needsReplenishment ? "#F6B93B" : "#2EC4B6",
            }}
          />
        </div>
      </Link>
      {canManage ? (
        <div className="absolute top-3 right-3">
          <EditFundButton
            fund={fund}
            settings={settings}
            people={people}
            departments={departments}
            viewerId={viewerId}
          />
        </div>
      ) : null}
    </div>
  );
}
