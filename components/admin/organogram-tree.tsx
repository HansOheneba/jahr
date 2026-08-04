import { UserAvatar } from "@/components/ui/user-avatar";
import type { OrganogramNode } from "@/lib/employees/get-directory";
import { PERMISSION_TAG_LABELS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

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

function PersonBox({ node }: { node: OrganogramNode }) {
  const institution = node.businessUnitName ?? "JA Group";

  return (
    <div className="w-[180px] rounded-xl border border-border bg-card px-3 py-3 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--accent-blue)_35%,var(--border))]">
      <div
        className={cn(
          "mx-auto mb-2 inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wide",
          institutionTone(node.businessUnitName),
        )}
      >
        {institution}
      </div>
      <UserAvatar
        name={node.name}
        src={node.avatarUrl}
        gender={node.gender}
        className="mx-auto mb-2 size-9"
      />
      <p className="truncate text-sm font-medium tracking-tight">{node.name}</p>
      <p className="mt-0.5 line-clamp-2 min-h-8 text-[11px] leading-snug text-muted-foreground">
        {node.jobTitle ?? "Team member"}
      </p>
      {node.departmentName ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {node.departmentName}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] font-medium tracking-wide text-accent-blue uppercase">
        {formatTags(node.tags)}
      </p>
    </div>
  );
}

function TreeNode({ node }: { node: OrganogramNode }) {
  const childCount = node.children.length;

  return (
    <div className="flex flex-col items-center">
      <PersonBox node={node} />

      {childCount > 0 ? (
        <>
          <div className="h-7 w-px bg-border" />

          <div className="flex items-start">
            {node.children.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === childCount - 1;
              const onlyChild = childCount === 1;

              return (
                <div
                  key={child.id}
                  className="relative flex flex-col items-center px-3"
                >
                  {!onlyChild ? (
                    <div className="absolute top-0 right-0 left-0 flex h-px">
                      <div
                        className={cn(
                          "h-px flex-1",
                          isFirst ? "bg-transparent" : "bg-border",
                        )}
                      />
                      <div
                        className={cn(
                          "h-px flex-1",
                          isLast ? "bg-transparent" : "bg-border",
                        )}
                      />
                    </div>
                  ) : null}

                  <div className="h-7 w-px bg-border" />

                  <TreeNode node={child} />
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
  if (roots.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        No reporting lines visible for your account.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-max px-8 py-10">
        <div className="flex items-start justify-center gap-8">
          {roots.map((root) => (
            <TreeNode key={root.id} node={root} />
          ))}
        </div>
      </div>
    </div>
  );
}
