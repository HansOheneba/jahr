"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { OrganogramNode } from "@/lib/employees/get-directory";
import { PERMISSION_TAG_LABELS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

const BLUE = "#0070F3";

function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, white)`;
}

function formatTags(tags: OrganogramNode["tags"]): string {
  if (tags.length === 0) return "Employee";
  return tags.map((slug) => PERMISSION_TAG_LABELS[slug] ?? slug).join(" · ");
}

/** Quiet institution tint - accent only, not a painted card. */
function institutionTone(name: string | null): string {
  switch (name) {
    case "JA Digital":
      return "bg-[color-mix(in_srgb,#55A8FD_14%,transparent)] text-[#2563EB]";
    case "JA Wealth":
      return "bg-[color-mix(in_srgb,#F6B93B_16%,transparent)] text-[#B45309]";
    case "JA Realty":
      return "bg-[color-mix(in_srgb,#FF7A59_14%,transparent)] text-[#C2410C]";
    case "JA Elements":
      return "bg-[color-mix(in_srgb,#2EC4B6_14%,transparent)] text-[#0F766E]";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

function Enter({
  delayMs = 0,
  className,
  children,
}: {
  delayMs?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("motion-safe:animate-dash-enter", className)}
      style={{ animationDelay: `${delayMs}ms` } satisfies CSSProperties}
    >
      {children}
    </div>
  );
}

function PersonBox({
  node,
  delayMs,
}: {
  node: OrganogramNode;
  delayMs: number;
}) {
  const institution = node.businessUnitName ?? "JA Group";
  const jobTitle = node.jobTitle ?? "Team member";
  const department = node.departmentName ?? "-";
  const tags = formatTags(node.tags);
  const href = `/admin/employees/${node.id}`;

  return (
    <Enter delayMs={delayMs}>
      <Link
        href={href}
        className={cn(
          "group flex h-[138px] w-[148px] flex-col items-center rounded-xl border border-border bg-card px-2 py-2 text-center",
          "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
          "transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out",
          "hover:border-[color-mix(in_srgb,var(--accent-blue)_32%,var(--border))] hover:bg-secondary/35",
          "hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)]",
          "active:scale-[0.98] motion-reduce:active:scale-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070F3]/35",
        )}
      >
        <div
          className={cn(
            "inline-flex h-4 max-w-full shrink-0 items-center truncate rounded px-1.5 text-[9px] font-medium tracking-wide",
            institutionTone(node.businessUnitName),
          )}
        >
          {institution}
        </div>
        <UserAvatar
          name={node.name}
          src={node.avatarUrl}
          gender={node.gender}
          size="sm"
          className="mt-1.5 shrink-0"
        />
        <div className="mt-1.5 flex min-h-0 w-full flex-1 flex-col">
          <p
            className="truncate text-xs font-medium tracking-tight leading-tight text-foreground"
            title={node.name}
          >
            {node.name}
          </p>
          <p
            className="mt-0.5 line-clamp-2 min-h-[26px] text-[10px] leading-[13px] text-muted-foreground"
            title={jobTitle}
          >
            {jobTitle}
          </p>
          <p
            className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground"
            title={department}
          >
            {department}
          </p>
          <p
            className="mt-auto truncate pt-1 text-[9px] font-medium tracking-wide text-accent-blue uppercase"
            title={tags}
          >
            {tags}
          </p>
        </div>
      </Link>
    </Enter>
  );
}

function TreeNode({
  node,
  depth,
  index,
}: {
  node: OrganogramNode;
  depth: number;
  index: number;
}) {
  const childCount = node.children.length;
  const delayMs = Math.min(depth * 70 + index * 35, 420);

  return (
    <div className="flex flex-col items-center">
      <PersonBox node={node} delayMs={delayMs} />

      {childCount > 0 ? (
        <>
          <div
            className="h-4 w-px"
            style={{ background: tint(BLUE, 55) }}
            aria-hidden
          />

          <div className="flex items-start">
            {node.children.map((child, childIndex) => {
              const isFirst = childIndex === 0;
              const isLast = childIndex === childCount - 1;
              const onlyChild = childCount === 1;

              return (
                <div
                  key={child.id}
                  className="relative flex flex-col items-center px-1.5"
                >
                  {!onlyChild ? (
                    <div className="absolute top-0 right-0 left-0 flex h-px">
                      <div
                        className={cn(
                          "h-px flex-1",
                          isFirst ? "bg-transparent" : undefined,
                        )}
                        style={
                          isFirst
                            ? undefined
                            : { background: tint(BLUE, 55) }
                        }
                      />
                      <div
                        className={cn(
                          "h-px flex-1",
                          isLast ? "bg-transparent" : undefined,
                        )}
                        style={
                          isLast ? undefined : { background: tint(BLUE, 55) }
                        }
                      />
                    </div>
                  ) : null}

                  <div
                    className="h-4 w-px"
                    style={{ background: tint(BLUE, 55) }}
                    aria-hidden
                  />

                  <TreeNode
                    node={child}
                    depth={depth + 1}
                    index={childIndex}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function OrganogramTree({ roots }: { roots: OrganogramNode[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  if (roots.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        No reporting lines visible for your account.
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-border bg-card",
        grabbing ? "cursor-grabbing select-none" : "cursor-grab",
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("a,button,input,textarea,select")) return;
        const scroller = scrollerRef.current;
        if (!scroller) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          scrollLeft: scroller.scrollLeft,
          scrollTop: scroller.scrollTop,
          moved: false,
        };
        scroller.setPointerCapture(event.pointerId);
        setGrabbing(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        const scroller = scrollerRef.current;
        if (!drag || !scroller || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) < 3) return;
        drag.moved = true;
        scroller.scrollLeft = drag.scrollLeft - dx;
        scroller.scrollTop = drag.scrollTop - dy;
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        setGrabbing(false);
        scrollerRef.current?.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setGrabbing(false);
      }}
    >
      <div
        className="inline-block min-h-full min-w-full px-6 py-8"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${tint(BLUE, 8)} 0%, transparent 70%)`,
        }}
      >
        <div className="flex w-max items-start justify-center gap-4">
          {roots.map((root, index) => (
            <TreeNode key={root.id} node={root} depth={0} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
