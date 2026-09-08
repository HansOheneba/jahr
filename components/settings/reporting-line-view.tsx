import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import type {
  ReportingLineContext,
  ReportingLinePerson,
} from "@/lib/employees/get-reporting-context";
import { cn } from "@/lib/utils";
import { ArrowUp, Building2, Users } from "lucide-react";
import type { ReactNode } from "react";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function VerticalStem({ className }: { className?: string }) {
  return (
    <div className={cn("w-px shrink-0 bg-border", className)} aria-hidden />
  );
}

function HorizontalBar({
  isFirst,
  isLast,
}: {
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="absolute top-0 right-0 left-0 flex h-px">
      <div className={cn("h-px flex-1 bg-border", isFirst && "bg-transparent")} />
      <div className={cn("h-px flex-1 bg-border", isLast && "bg-transparent")} />
    </div>
  );
}

function BranchColumn({
  isFirst,
  isLast,
  only,
  children,
}: {
  isFirst: boolean;
  isLast: boolean;
  only: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center px-5">
      {!only ? <HorizontalBar isFirst={isFirst} isLast={isLast} /> : null}
      <VerticalStem className="h-6" />
      {children}
    </div>
  );
}

function PersonCard({
  person,
  isViewer = false,
}: {
  person: ReportingLinePerson;
  isViewer?: boolean;
}) {
  const jobTitle = person.jobTitle ?? "Team member";

  return (
    <div
      className={cn(
        "flex w-[188px] shrink-0 flex-col items-center rounded-xl border bg-card px-4 py-4 text-center",
        isViewer ? "border-foreground" : "border-border",
      )}
    >
      <UserAvatar
        name={person.name}
        src={person.avatarUrl}
        gender={person.gender}
        className="size-16 shrink-0"
      />

      <div className="mt-3 flex w-full min-w-0 flex-col items-center gap-1.5">
        {isViewer ? (
          <Badge variant="outline" className="h-5 px-2 text-[10px] font-medium uppercase">
            You
          </Badge>
        ) : null}

        <p
          className="w-full truncate text-[15px] font-semibold tracking-tight text-foreground"
          title={person.name}
        >
          {person.name}
        </p>

        <p
          className="line-clamp-2 w-full text-sm leading-5 text-muted-foreground"
          title={jobTitle}
        >
          {jobTitle}
        </p>

        {person.departmentName ? (
          <span
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            title={person.departmentName}
          >
            <Building2 className="size-3 shrink-0" />
            <span className="truncate">{person.departmentName}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PersonBranch({
  people,
  viewerId,
}: {
  people: ReportingLinePerson[];
  viewerId: string;
}) {
  if (people.length === 0) {
    return null;
  }

  if (people.length === 1) {
    const person = people[0];
    return (
      <div className="flex flex-col items-center">
        <VerticalStem className="h-6" />
        <PersonCard person={person} isViewer={person.id === viewerId} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <VerticalStem className="h-6" />
      <div className="flex items-start justify-center">
        {people.map((person, index) => (
          <BranchColumn
            key={person.id}
            isFirst={index === 0}
            isLast={index === people.length - 1}
            only={false}
          >
            <PersonCard person={person} isViewer={person.id === viewerId} />
          </BranchColumn>
        ))}
      </div>
    </div>
  );
}

function TeamSummary({
  context,
  teamSize,
}: {
  context: ReportingLineContext;
  teamSize: number;
}) {
  const { manager, departmentName, businessUnitName, isOrgLeader } = context;
  const teamLabel = departmentName ? `${departmentName} team` : "Your team";

  return (
    <aside className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
      <p className="text-sm font-semibold text-foreground">{teamLabel}</p>

      <ul className="mt-4 space-y-3">
        <li className="flex items-start gap-2.5 text-sm">
          <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="text-foreground">
            <span className="font-medium">{teamSize}</span>
            <span className="text-muted-foreground">
              {" "}
              {teamSize === 1 ? "team member" : "team members"}
            </span>
          </span>
        </li>

        {isOrgLeader && !manager ? (
          <li className="flex items-start gap-2.5 text-sm">
            <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              You lead{" "}
              <span className="font-medium text-foreground">{businessUnitName}</span>
            </span>
          </li>
        ) : manager ? (
          <li className="flex items-start gap-2.5 text-sm">
            <ArrowUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              Reports to{" "}
              <span className="font-medium text-foreground">{manager.name}</span>
            </span>
          </li>
        ) : (
          <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <ArrowUp className="mt-0.5 size-4 shrink-0" />
            No manager assigned yet
          </li>
        )}

        <li className="flex items-start gap-2.5 text-sm">
          <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">{businessUnitName}</span>
        </li>
      </ul>
    </aside>
  );
}

export function ReportingLineView({ context }: { context: ReportingLineContext }) {
  const { viewer, manager, peers, directReports, departmentName, businessUnitName, isOrgLeader } =
    context;

  const peerRow = [viewer, ...peers].sort((a, b) => a.name.localeCompare(b.name));
  const contextLabel = [businessUnitName, departmentName].filter(Boolean).join(" · ");
  const teamSize = peerRow.length;
  const showPeerSection =
    peerRow.length > 0 &&
    (manager !== null || peers.length > 0 || isOrgLeader);
  const showDirectReports = directReports.length > 0;

  return (
    <div className="flex min-h-full flex-col">
      <div className="shrink-0 border-b border-border px-5 py-3.5 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Team overview
        </p>
        {contextLabel ? (
          <p className="mt-0.5 text-base font-semibold text-foreground">{contextLabel}</p>
        ) : null}
      </div>

      <div className="grid flex-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
        <div className="flex min-h-[360px] flex-col items-center justify-center px-4 py-8 sm:px-6">
          <div className="flex w-full max-w-3xl flex-col items-center">
            {isOrgLeader && !manager ? (
              <div className="mb-6 w-full max-w-md rounded-xl border border-border px-4 py-3 text-center">
                <SectionLabel>Organisation</SectionLabel>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  You lead {businessUnitName}
                </p>
              </div>
            ) : manager ? (
              <div className="flex w-full flex-col items-center">
                <SectionLabel>You report to</SectionLabel>
                <div className="mt-4">
                  <PersonCard person={manager} />
                </div>
                {showPeerSection ? <VerticalStem className="mt-1 h-8" /> : null}
              </div>
            ) : (
              <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
                No manager on file. Contact HR.
              </p>
            )}

            {showPeerSection ? (
              <div className="flex w-full flex-col items-center">
                <SectionLabel>Your team</SectionLabel>
                <PersonBranch people={peerRow} viewerId={viewer.id} />
              </div>
            ) : null}

            {showDirectReports ? (
              <div className="mt-2 flex w-full flex-col items-center">
                <VerticalStem className="h-8" />
                <SectionLabel>People who report to you</SectionLabel>
                <PersonBranch people={directReports} viewerId={viewer.id} />
              </div>
            ) : null}
          </div>
        </div>

        <TeamSummary context={context} teamSize={teamSize} />
      </div>
    </div>
  );
}
