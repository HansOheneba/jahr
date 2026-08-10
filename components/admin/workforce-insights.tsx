"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarPlus,
  ChartPie,
  MapPin,
  Mars,
  Network,
  Timer,
  UserMinus,
  Users,
  UserCheck,
  Venus,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  formatAverageAge,
  formatAverageTenure,
  formatManagerRatio,
  formatTurnoverRate,
  type WorkforceBreakdownItem,
  type WorkforceInsights,
} from "@/lib/employees/workforce-insights";
import { cn } from "@/lib/utils";

const PEOPLE = "#F6B93B";
const TEAL = "#2EC4B6";
const CORAL = "#FF7A59";
const SKY = "#55A8FD";
const LAVENDER = "#8B7CF8";
const BLUE = "#0070F3";
const CHROME = "#171717";

function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, white)`;
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  emphasize?: boolean;
}

function MetricCard({
  label,
  value,
  hint,
  accent,
  icon: Icon,
  href,
  emphasize = false,
}: MetricCardProps) {
  const body = (
    <div
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5",
        "transition-[background-color,border-color,transform] duration-150 ease-out",
        href &&
          "hover:bg-secondary/40 active:scale-[0.985] motion-reduce:active:scale-100",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "font-medium tracking-tight tabular-nums text-foreground",
              emphasize ? "text-3xl" : "text-2xl",
            )}
          >
            {value}
          </p>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-md"
          style={{ background: tint(accent, 12), color: accent }}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between gap-2">
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
        {href ? (
          <ArrowRight
            className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full outline-none">
        {body}
      </Link>
    );
  }

  return <div className="h-full">{body}</div>;
}

function BreakdownBars({
  items,
  accent,
  ready,
}: {
  items: WorkforceBreakdownItem[];
  accent: string;
  ready: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-3.5">
      {items.map((item, index) => {
        const pct = total === 0 ? 0 : Math.round((item.count / total) * 100);
        return (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm">{item.label}</p>
              <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">{item.count}</span>
                <span className="text-muted-foreground/70"> · {pct}%</span>
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full origin-left rounded-full transition-[width] duration-700 ease-dash"
                style={{
                  width: ready ? `${Math.max(pct, pct > 0 ? 3 : 0)}%` : "0%",
                  background: accent,
                  transitionDelay: `${index * 40}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GenderDistributionCard({
  gender,
  ready,
  delayMs,
}: {
  gender: WorkforceInsights["byGender"];
  ready: boolean;
  delayMs: number;
}) {
  const gendered = gender.male + gender.female;
  const hasSplit = gendered > 0;

  return (
    <Enter delayMs={delayMs}>
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border px-5 py-4">
          <div
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md"
            style={{ background: tint(SKY, 10), color: SKY }}
          >
            <Users className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-medium">Gender</h2>
            <p className="text-xs text-muted-foreground">
              Demographic split across the current workforce.
            </p>
          </div>
        </div>
        <div className="space-y-5 p-5">
          {!hasSplit ? (
            <p className="text-sm text-muted-foreground">
              Add gender on employee profiles to unlock this split.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3.5">
                  <div
                    className="flex size-10 items-center justify-center rounded-md"
                    style={{ background: tint(SKY, 14), color: SKY }}
                  >
                    <Mars className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Male</p>
                    <p className="text-2xl font-medium tracking-tight tabular-nums">
                      {gender.male}
                      <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                        {gender.malePct}%
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3.5">
                  <div
                    className="flex size-10 items-center justify-center rounded-md"
                    style={{ background: tint(CORAL, 14), color: CORAL }}
                  >
                    <Venus className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Female</p>
                    <p className="text-2xl font-medium tracking-tight tabular-nums">
                      {gender.female}
                      <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                        {gender.femalePct}%
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full transition-[width] duration-700 ease-dash"
                    style={{
                      width: ready ? `${gender.malePct}%` : "0%",
                      background: SKY,
                    }}
                  />
                  <div
                    className="h-full transition-[width] duration-700 ease-dash"
                    style={{
                      width: ready ? `${gender.femalePct}%` : "0%",
                      background: CORAL,
                      transitionDelay: "80ms",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Mars className="size-3.5 text-[#55A8FD]" aria-hidden />
                    <span className="tabular-nums">{gender.malePct}%</span>
                  </span>
                  <span className="tabular-nums">
                    {gender.male} / {gender.female}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="tabular-nums">{gender.femalePct}%</span>
                    <Venus className="size-3.5 text-[#FF7A59]" aria-hidden />
                  </span>
                </div>
              </div>

              {gender.other > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {gender.other}{" "}
                  {gender.other === 1 ? "person has" : "people have"} no male /
                  female gender recorded and {gender.other === 1 ? "is" : "are"}{" "}
                  excluded from the percentage split.
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </Enter>
  );
}

function CompositionCard({
  title,
  description,
  items,
  accent,
  icon: Icon,
  emptyLabel,
  ready,
  delayMs,
}: {
  title: string;
  description: string;
  items: WorkforceBreakdownItem[];
  accent: string;
  icon: ComponentType<{ className?: string }>;
  emptyLabel: string;
  ready: boolean;
  delayMs: number;
}) {
  return (
    <Enter delayMs={delayMs}>
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border px-5 py-4">
          <div
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md"
            style={{ background: tint(accent, 10), color: accent }}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="p-5">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <BreakdownBars items={items} accent={accent} ready={ready} />
          )}
        </div>
      </section>
    </Enter>
  );
}

export function WorkforceInsightsView({
  insights,
}: {
  insights: WorkforceInsights;
}) {
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setBarsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const activeShare =
    insights.totalEmployees === 0
      ? null
      : Math.round((insights.activeEmployees / insights.totalEmployees) * 100);

  return (
    <div className="flex w-full flex-col gap-8">
      <Enter>
        <div
          className="relative overflow-hidden rounded-xl border border-border px-5 py-5 sm:px-6"
          style={{
            background: `linear-gradient(135deg, ${tint(PEOPLE, 14)} 0%, #ffffff 52%, ${tint(SKY, 8)} 100%)`,
          }}
        >
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium tracking-wide text-[#8A6A12] uppercase">
                People
              </p>
              <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
                Workforce insights
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                A live read of who is here, who joined or left, and how the
                company is shaped.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/employees"
                className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
              >
                Open directory
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/admin/alumni"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "gap-1.5 border-transparent bg-white/80",
                )}
              >
                View alumni
              </Link>
            </div>
          </div>
        </div>
      </Enter>

      <section className="space-y-3">
        <Enter delayMs={60}>
          <SectionLabel>Headcount</SectionLabel>
        </Enter>
        <div className="grid gap-3 sm:grid-cols-2">
          <Enter delayMs={80}>
            <MetricCard
              label="Active employees"
              value={String(insights.activeEmployees)}
              hint={
                activeShare === null
                  ? "People marked active today"
                  : `${activeShare}% of current workforce`
              }
              accent={TEAL}
              icon={UserCheck}
              href="/admin/employees"
              emphasize
            />
          </Enter>
          <Enter delayMs={120}>
            <MetricCard
              label="Total on file"
              value={String(insights.totalEmployees)}
              hint="Active, onboarding, and inactive. Alumni excluded."
              accent={PEOPLE}
              icon={Users}
              href="/admin/employees"
            />
          </Enter>
        </div>
      </section>

      <section className="space-y-3">
        <Enter delayMs={140}>
          <div className="space-y-1">
            <SectionLabel>Movement</SectionLabel>
            <p className="text-xs text-muted-foreground">
              Joins and exits this year, plus how that compares to headcount.
            </p>
          </div>
        </Enter>
        <div className="grid gap-3 sm:grid-cols-3">
          <Enter delayMs={160}>
            <MetricCard
              label="New this month"
              value={String(insights.newHiresThisMonth)}
              hint={`${insights.newHiresThisYear} started this year`}
              accent={TEAL}
              icon={CalendarPlus}
            />
          </Enter>
          <Enter delayMs={200}>
            <MetricCard
              label="Left this year"
              value={String(insights.leaversThisYear)}
              hint={`${insights.alumniAllTime} alumni in total`}
              accent={CORAL}
              icon={UserMinus}
              href="/admin/alumni"
            />
          </Enter>
          <Enter delayMs={240}>
            <MetricCard
              label="Turnover"
              value={formatTurnoverRate(insights.turnoverRate)}
              hint="Leavers this year relative to active headcount"
              accent={CORAL}
              icon={ChartPie}
            />
          </Enter>
        </div>
      </section>

      <section className="space-y-3">
        <Enter delayMs={260}>
          <div className="space-y-1">
            <SectionLabel>Workforce profile</SectionLabel>
            <p className="text-xs text-muted-foreground">
              Tenure, age, and how many people each manager supports.
            </p>
          </div>
        </Enter>
        <div className="grid gap-3 sm:grid-cols-3">
          <Enter delayMs={280}>
            <MetricCard
              label="Average tenure"
              value={formatAverageTenure(insights.averageTenureYears)}
              hint="Among active people with a start date"
              accent={SKY}
              icon={Timer}
            />
          </Enter>
          <Enter delayMs={320}>
            <MetricCard
              label="Average age"
              value={formatAverageAge(insights.averageAgeYears)}
              hint={
                insights.averageAgeSampleSize > 0
                  ? `From ${insights.averageAgeSampleSize} profiles with a date of birth`
                  : "Add dates of birth on profiles to unlock this"
              }
              accent={LAVENDER}
              icon={Users}
            />
          </Enter>
          <Enter delayMs={360}>
            <MetricCard
              label="Manager span"
              value={formatManagerRatio(insights.employeesPerManager)}
              hint={
                insights.managerCount > 0
                  ? `${insights.managerCount} managers for ${insights.nonManagerCount} people`
                  : "No managers with active reports yet"
              }
              accent={BLUE}
              icon={Network}
              href="/admin/organogram"
            />
          </Enter>
        </div>
      </section>

      <section className="space-y-3">
        <Enter delayMs={380}>
          <div className="space-y-1">
            <SectionLabel>Composition</SectionLabel>
            <p className="text-xs text-muted-foreground">
              Where people sit, and how they are engaged. Current workforce
              only.
            </p>
          </div>
        </Enter>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <GenderDistributionCard
              gender={insights.byGender}
              ready={barsReady}
              delayMs={400}
            />
          </div>
          <CompositionCard
            title="Department"
            description="Share of people by department."
            items={insights.byDepartment}
            accent={PEOPLE}
            icon={Building2}
            emptyLabel="Assign departments on profiles to see this split."
            ready={barsReady}
            delayMs={440}
          />
          <CompositionCard
            title="Location"
            description="Office location recorded on each profile."
            items={insights.byLocation}
            accent={SKY}
            icon={MapPin}
            emptyLabel="Add office locations to unlock this view."
            ready={barsReady}
            delayMs={480}
          />
          <CompositionCard
            title="Employment type"
            description="Full-time vs part-time."
            items={insights.byEmploymentType}
            accent={TEAL}
            icon={Briefcase}
            emptyLabel="No employment type data yet."
            ready={barsReady}
            delayMs={520}
          />
          <CompositionCard
            title="Category"
            description="Employees, contractors, and interns."
            items={insights.byCategory}
            accent={CHROME}
            icon={ChartPie}
            emptyLabel="No category data yet."
            ready={barsReady}
            delayMs={560}
          />
        </div>
      </section>
    </div>
  );
}
