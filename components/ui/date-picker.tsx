"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  /** First month available in the month/year dropdowns. */
  startMonth?: Date;
  /** Last month available in the month/year dropdowns. */
  endMonth?: Date;
  /** Month shown when the picker opens with no value. */
  defaultMonth?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  id,
  className,
  disabled,
  startMonth,
  endMonth,
  defaultMonth,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const resolvedEndMonth = React.useMemo(() => {
    if (endMonth) return endMonth;
    const next = new Date();
    next.setFullYear(next.getFullYear() + 10);
    return next;
  }, [endMonth]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!value}
            className={cn(
              "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {value ? format(value, "d MMM yyyy") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={resolvedEndMonth}
          defaultMonth={defaultMonth ?? value}
        />
      </PopoverContent>
    </Popover>
  );
}
