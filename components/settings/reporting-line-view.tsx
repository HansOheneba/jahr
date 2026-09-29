import type { ReactNode } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type {
  ReportingLineContext,
  ReportingLinePerson,
} from "@/lib/employees/get-reporting-context";

function PersonRow({ person }: { person: ReportingLinePerson }) {
  const detail = [person.jobTitle, person.departmentName]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex min-w-0 items-center gap-3 py-3">
      <UserAvatar
        name={person.name}
        src={person.avatarUrl}
        gender={person.gender}
        size="sm"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {person.name}
        </p>
        {detail ? (
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}

export function ReportingLineView({ context }: { context: ReportingLineContext }) {
  const { manager, peers, directReports, departmentName, businessUnitName, isOrgLeader } =
    context;
  const contextLabel = [businessUnitName, departmentName].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8 px-6 py-6">
      {contextLabel ? (
        <p className="text-sm text-foreground">{contextLabel}</p>
      ) : null}

      <Section title="You report to">
        {manager ? (
          <ul>
            <PersonRow person={manager} />
          </ul>
        ) : isOrgLeader ? (
          <p className="py-3 text-sm text-foreground">
            You lead {businessUnitName}
          </p>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">
            No manager on file.
          </p>
        )}
      </Section>

      <Section title="Your team">
        {peers.length > 0 ? (
          <ul className="divide-y divide-border">
            {peers.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </ul>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">No teammates.</p>
        )}
      </Section>

      {directReports.length > 0 ? (
        <Section title="People who report to you">
          <ul className="divide-y divide-border">
            {directReports.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
