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
    case "JA Group":
      return "bg-[color-mix(in_srgb,#171717_10%,transparent)] text-[#171717]";
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

interface UnitGroup {
  label: string;
  nodes: OrganogramNode[];
}

function unitLabel(name: string | null): string {
  return name ?? "JA Group";
}

function groupByUnit(nodes: OrganogramNode[]): UnitGroup[] {
  const groups: UnitGroup[] = [];
  for (const node of nodes) {
    const label = unitLabel(node.businessUnitName);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.nodes.push(node);
    } else {
      groups.push({ label, nodes: [node] });
    }
  }
  return groups;
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

function Stem() {
  return (
    <div
      className="h-4 w-px"
      style={{ background: tint(BLUE, 55) }}
      aria-hidden
    />
  );
}

function StaffConnector() {
  return (
    <div
      className="h-px w-5 shrink-0"
      style={{ background: tint(BLUE, 55) }}
      aria-hidden
    />
  );
}

function HBar({ isFirst, isLast }: { isFirst: boolean; isLast: boolean }) {
  return (
    <div className="absolute top-0 right-0 left-0 flex h-px">
      <div
        className={cn("h-px flex-1", isFirst ? "bg-transparent" : undefined)}
        style={isFirst ? undefined : { background: tint(BLUE, 55) }}
      />
      <div
        className={cn("h-px flex-1", isLast ? "bg-transparent" : undefined)}
        style={isLast ? undefined : { background: tint(BLUE, 55) }}
      />
    </div>
  );
}

function ConnectorColumn({
  isFirst,
  isLast,
  only,
  wide = false,
  children,
}: {
  isFirst: boolean;
  isLast: boolean;
  only: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center",
        wide ? "px-3" : "px-1.5",
      )}
    >
      {!only ? <HBar isFirst={isFirst} isLast={isLast} /> : null}
      <Stem />
      {children}
    </div>
  );
}

function UnitLabel({ name }: { name: string }) {
  return (
    <div
      className={cn(
        "inline-flex h-6 max-w-[168px] shrink-0 items-center truncate rounded-md px-2 text-[10px] font-medium tracking-wide",
        institutionTone(name),
      )}
      title={name}
    >
      {name}
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
  const institution = unitLabel(node.businessUnitName);
  const jobTitle = node.jobTitle?.trim() || null;
  const department = node.departmentName?.trim() || null;
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
            institutionTone(institution),
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
          {jobTitle ? (
            <p
              className="mt-0.5 line-clamp-2 text-[10px] leading-[13px] text-muted-foreground"
              title={jobTitle}
            >
              {jobTitle}
            </p>
          ) : null}
          {department ? (
            <p
              className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground"
              title={department}
            >
              {department}
            </p>
          ) : null}
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

function UnitCluster({
  group,
  depth,
}: {
  group: UnitGroup;
  depth: number;
}) {
  const people = group.nodes;

  return (
    <div className="flex flex-col items-center">
      <UnitLabel name={group.label} />
      {people.length === 1 ? (
        <>
          <Stem />
          <TreeNode node={people[0]} depth={depth} index={0} />
        </>
      ) : (
        <>
          <Stem />
          <div className="flex items-start">
            {people.map((child, childIndex) => (
              <ConnectorColumn
                key={child.id}
                isFirst={childIndex === 0}
                isLast={childIndex === people.length - 1}
                only={false}
              >
                <TreeNode
                  node={child}
                  depth={depth}
                  index={childIndex}
                />
              </ConnectorColumn>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChildBranches({
  nodes,
  depth,
}: {
  nodes: OrganogramNode[];
  depth: number;
}) {
  const groups = groupByUnit(nodes);
  const showClusterLabels = nodes.length > 1;

  return (
    <div className="flex items-start">
      {groups.map((group, groupIndex) => {
        const isFirst = groupIndex === 0;
        const isLast = groupIndex === groups.length - 1;
        const only = groups.length === 1;

        return (
          <ConnectorColumn
            key={group.label}
            isFirst={isFirst}
            isLast={isLast}
            only={only}
            wide={showClusterLabels}
          >
            {showClusterLabels ? (
              <UnitCluster group={group} depth={depth} />
            ) : (
              <TreeNode node={group.nodes[0]} depth={depth} index={0} />
            )}
          </ConnectorColumn>
        );
      })}
    </div>
  );
}

function AssistantNeck({
  assistants,
  depth,
}: {
  assistants: OrganogramNode[];
  depth: number;
}) {
  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] self-stretch">
      <div className="flex items-center justify-end">
        {assistants.map((assistant, assistantIndex) => (
          <div key={assistant.id} className="flex items-center">
            <PersonBox
              node={assistant}
              delayMs={Math.min(depth * 70 + assistantIndex * 35, 420)}
            />
            <StaffConnector />
          </div>
        ))}
      </div>
      <div
        className="w-px min-h-[138px] self-stretch"
        style={{ background: tint(BLUE, 55) }}
        aria-hidden
      />
      <div />
    </div>
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
  const assistants = node.assistants;
  const childCount = node.children.length;
  const delayMs = Math.min(depth * 70 + index * 35, 420);

  return (
    <div className="flex flex-col items-center">
      <PersonBox node={node} delayMs={delayMs} />

      {assistants.length > 0 ? (
        <>
          <Stem />
          <AssistantNeck assistants={assistants} depth={depth} />
          {childCount > 0 ? <Stem /> : null}
        </>
      ) : childCount > 0 ? (
        <Stem />
      ) : null}

      {childCount > 0 ? (
        <ChildBranches nodes={node.children} depth={depth + 1} />
      ) : null}
    </div>
  );
}

function Forest({ roots }: { roots: OrganogramNode[] }) {
  const groups = groupByUnit(roots);
  const showClusterLabels = roots.length > 1;

  if (!showClusterLabels) {
    return (
      <div className="flex w-max items-start justify-center gap-4">
        {roots.map((root, index) => (
          <TreeNode key={root.id} node={root} depth={0} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-max items-start justify-center">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col items-center px-4">
          <UnitCluster group={group} depth={0} />
        </div>
      ))}
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
        <Forest roots={roots} />
      </div>
    </div>
  );
}
