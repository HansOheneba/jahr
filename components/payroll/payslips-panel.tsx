"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { availablePayPeriods, periodKey } from "@/lib/payroll/period";
import type { PayslipRecord } from "@/lib/types/employee";
import { cn } from "@/lib/utils";

export function PayslipsPanel({
  employeeId,
  payslips,
  canGenerate,
  employmentStartDate = null,
  hasPayPackage = false,
}: {
  employeeId: string;
  payslips: PayslipRecord[];
  canGenerate: boolean;
  employmentStartDate?: string | null;
  hasPayPackage?: boolean;
}) {
  const periods = useMemo(
    () =>
      availablePayPeriods({
        count: 12,
        earliestDate: employmentStartDate,
      }),
    [employmentStartDate],
  );

  const [period, setPeriod] = useState(() =>
    periods[0] ? periodKey(periods[0].periodStart) : "",
  );

  const selectedPeriod = useMemo(() => {
    if (periods.some((item) => periodKey(item.periodStart) === period)) {
      return period;
    }
    return periods[0] ? periodKey(periods[0].periodStart) : "";
  }, [period, periods]);

  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const slip of payslips) {
      if (slip.period_start) keys.add(periodKey(slip.period_start));
    }
    return keys;
  }, [payslips]);

  const canDownload =
    canGenerate && hasPayPackage && selectedPeriod.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">Payslips</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download a PDF for any month since your start date. The first
            download locks that month’s figures.
          </p>
        </div>
        {canGenerate ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {periods.length > 0 ? (
              <Select
                value={selectedPeriod}
                onValueChange={(value) => {
                  if (value) setPeriod(value);
                }}
                items={periods.map((item) => ({
                  value: periodKey(item.periodStart),
                  label: item.periodLabel,
                }))}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((item) => (
                    <SelectItem
                      key={item.periodStart}
                      value={periodKey(item.periodStart)}
                    >
                      {item.periodLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {canDownload ? (
              <a
                href={`/api/payslips/download?employeeId=${encodeURIComponent(employeeId)}&period=${encodeURIComponent(selectedPeriod)}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                <Download className="size-3.5" />
                {existingKeys.has(selectedPeriod) ? "Download" : "Generate PDF"}
              </a>
            ) : (
              <span
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "pointer-events-none opacity-50",
                )}
                aria-disabled
              >
                <Download className="size-3.5" />
                Generate PDF
              </span>
            )}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {!hasPayPackage ? (
          <p className="text-sm text-muted-foreground">
            No pay package on file yet. Ask HR to set up earnings and deductions
            first.
          </p>
        ) : periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No eligible pay periods yet. Payslips become available from your
            start date.
          </p>
        ) : payslips.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payslips generated yet. Pick a month above to create one.
          </p>
        ) : (
          payslips.map((slip) => (
            <div
              key={slip.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{slip.period_label}</p>
                {slip.net_pay !== null && slip.net_pay !== undefined ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Net {slip.currency ?? "GHS"}{" "}
                    {slip.net_pay.toLocaleString("en-GH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-md font-normal">
                  Ready
                </Badge>
                <a
                  href={`/api/payslips/${slip.id}/pdf`}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "secondary" }),
                  )}
                >
                  <Download className="size-3.5" />
                  PDF
                </a>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
