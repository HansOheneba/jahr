"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CURRENCY_OPTIONS,
  formatCurrencyLabel,
  formatCurrencyTrigger,
} from "@/lib/payroll/currencies";
import { cn } from "@/lib/utils";

export function CurrencySelect({
  value,
  onValueChange,
  disabled,
}: {
  value: string;
  onValueChange: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return CURRENCY_OPTIONS;
    return CURRENCY_OPTIONS.filter(
      (option) =>
        option.code.toLowerCase().includes(needle) ||
        option.name.toLowerCase().includes(needle) ||
        option.symbol.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm",
          "hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="truncate">
          {value ? formatCurrencyTrigger(value) : "Select currency"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-2" align="start">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search currency…"
          className="mb-2 h-9"
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No currencies found.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {filtered.map((option) => {
                const selected = option.code === value;
                return (
                  <li key={option.code}>
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        "h-auto w-full justify-start gap-2 px-2 py-2 font-normal",
                        selected && "bg-muted",
                      )}
                      onClick={() => {
                        onValueChange(option.code);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate text-left">
                        {formatCurrencyLabel(option.code)}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
