"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { MentionCandidate } from "@/lib/communications/types";
import { cn } from "@/lib/utils";

export interface MentionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface MentionListProps {
  items: MentionCandidate[];
  command: (item: MentionCandidate) => void;
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((index) =>
            (index + items.length - 1) % Math.max(items.length, 1),
          );
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((index) => (index + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
          No people found
        </div>
      );
    }

    return (
      <div className="z-50 max-h-56 w-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              index === selectedIndex
                ? "bg-secondary text-foreground"
                : "text-foreground hover:bg-secondary/60",
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              command(item);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-muted-foreground">
              {item.label.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.label}</span>
              {item.jobTitle ? (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {item.jobTitle}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    );
  },
);
