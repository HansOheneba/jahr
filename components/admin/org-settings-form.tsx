"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { updateReportingCurrency } from "@/lib/org/actions";
import { useAsyncAction } from "@/lib/hooks/use-async-action";
import {
  formatCurrencyLabel,
  REPORTING_CURRENCIES,
  type ReportingCurrency,
} from "@/lib/payroll/currencies";

const CURRENCY_ITEMS = REPORTING_CURRENCIES.map((code) => ({
  value: code,
  label: formatCurrencyLabel(code),
}));

export function OrgSettingsForm({
  reportingCurrency,
}: {
  reportingCurrency: ReportingCurrency;
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [currency, setCurrency] = useState<ReportingCurrency>(
    reportingCurrency,
  );

  const isDirty = currency !== reportingCurrency;

  function handleSave() {
    void run(async () => {
      const result = await updateReportingCurrency(currency);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Reporting currency saved");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-56 flex-col gap-1.5">
        <Label htmlFor="reporting-currency">Reporting currency</Label>
        <Select
          value={currency}
          onValueChange={(value) => {
            if (value) setCurrency(value as ReportingCurrency);
          }}
          items={CURRENCY_ITEMS}
        >
          <SelectTrigger id="reporting-currency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            {CURRENCY_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} disabled={pending || !isDirty}>
        {pending ? <Spinner /> : null}
        Save
      </Button>
    </div>
  );
}
