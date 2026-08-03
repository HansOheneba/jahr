import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function PageSkeletonFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("flex w-full flex-col gap-5", className)}
    >
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({
  withAction = false,
  withBack = false,
}: {
  withAction?: boolean;
  withBack?: boolean;
}) {
  return (
    <div className="space-y-3">
      {withBack ? <Skeleton className="h-8 w-24" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {withAction ? <Skeleton className="h-8 w-32 rounded-md" /> : null}
      </div>
    </div>
  );
}

function CardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeaderSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <Skeleton className="mt-0.5 size-8 shrink-0 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          {lines > 1 ? <Skeleton className="h-3 w-44" /> : null}
        </div>
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

function AvatarRowSkeleton({ dense = false }: { dense?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", dense ? "py-2" : "py-3")}>
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-36 max-w-[70%]" />
        <Skeleton className="h-3 w-24 max-w-[45%]" />
      </div>
      <Skeleton className="h-6 w-16 rounded-md" />
    </div>
  );
}

function TableRowsSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn("h-3", index === 0 ? "w-32" : "w-20")}
          />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="hidden h-3 w-28 sm:block" />
            <Skeleton className="hidden h-3 w-24 md:block" />
            <Skeleton className="ml-auto h-6 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormFieldsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn("space-y-2", index === rows - 1 && "sm:col-span-2")}
        >
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <CardShell className="px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        </div>
      </CardShell>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardShell key={index} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="size-10 rounded-md" />
            </div>
            <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
            <Skeleton className="mt-2 h-3 w-28" />
          </CardShell>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <CardShell>
            <CardHeaderSkeleton lines={2} />
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <Skeleton className="mx-auto size-36 shrink-0 rounded-full sm:mx-0" />
              <div className="grid flex-1 grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2 rounded-lg bg-secondary/40 p-3">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                ))}
              </div>
            </div>
          </CardShell>

          <CardShell>
            <CardHeaderSkeleton />
            <div className="divide-y divide-border px-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <AvatarRowSkeleton key={index} />
              ))}
            </div>
          </CardShell>
        </div>

        <div className="flex flex-col gap-4">
          <CardShell>
            <CardHeaderSkeleton />
            <div className="grid gap-2 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-3"
                >
                  <Skeleton className="size-9 rounded-md" />
                  <Skeleton className="h-3.5 flex-1" />
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell>
            <CardHeaderSkeleton />
            <div className="divide-y divide-border px-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <AvatarRowSkeleton key={index} dense />
              ))}
            </div>
          </CardShell>
        </div>
      </div>
    </PageSkeletonFrame>
  );
}

export function LeavePageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <div className="flex flex-col gap-4">
          <CardShell className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <div className="flex gap-2">
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, month) => (
                <div key={month} className="space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 35 }).map((_, day) => (
                      <Skeleton key={day} className="aspect-square rounded-md" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell>
            <CardHeaderSkeleton />
            <div className="divide-y divide-border px-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <AvatarRowSkeleton key={index} />
              ))}
            </div>
          </CardShell>
        </div>

        <div className="flex flex-col gap-4">
          <CardShell className="p-5">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-7 w-10" />
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell className="p-5">
            <Skeleton className="mb-4 h-5 w-32" />
            <FormFieldsSkeleton rows={4} />
            <Skeleton className="mt-5 h-10 w-full rounded-md" />
          </CardShell>

          <CardShell>
            <CardHeaderSkeleton />
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          </CardShell>
        </div>
      </div>
    </PageSkeletonFrame>
  );
}

export function DocumentsPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton />
      {Array.from({ length: 2 }).map((_, card) => (
        <CardShell key={card}>
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="divide-y divide-border px-5">
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex items-center gap-3 py-3.5">
                <Skeleton className="size-10 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-44 max-w-[70%]" />
                  <Skeleton className="h-3 w-28 max-w-[40%]" />
                </div>
                <Skeleton className="size-8 rounded-md" />
              </div>
            ))}
          </div>
        </CardShell>
      ))}
    </PageSkeletonFrame>
  );
}

export function ApprovalsPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardShell key={index} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
            <div className="mt-2 flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardShell>
        ))}
      </div>
      <CardShell>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <Skeleton className="h-10 w-56 max-w-full rounded-md" />
        </div>
        <div className="divide-y divide-border px-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <AvatarRowSkeleton key={index} />
          ))}
        </div>
      </CardShell>
    </PageSkeletonFrame>
  );
}

export function SettingsPageSkeleton() {
  return (
    <PageSkeletonFrame className="mx-auto max-w-2xl gap-6">
      <PageHeaderSkeleton />
      <CardShell className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
        <FormFieldsSkeleton rows={6} />
        <Skeleton className="mt-6 h-10 w-28 rounded-md" />
      </CardShell>
    </PageSkeletonFrame>
  );
}

export function EmployeesPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton withAction />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-20 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <TableRowsSkeleton rows={8} />
    </PageSkeletonFrame>
  );
}

export function EmployeeDetailPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton withBack />
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 border-b border-border pb-px">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <CardShell className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <FormFieldsSkeleton rows={6} />
      </CardShell>
    </PageSkeletonFrame>
  );
}

export function FormPageSkeleton({
  maxWidthClassName = "max-w-3xl",
}: {
  maxWidthClassName?: string;
}) {
  return (
    <PageSkeletonFrame
      className={cn(maxWidthClassName !== "w-full" && "mx-auto", maxWidthClassName)}
    >
      <PageHeaderSkeleton withBack />
      <CardShell className="p-6">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
        <FormFieldsSkeleton rows={8} />
        <div className="mt-6 flex justify-end gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </CardShell>
    </PageSkeletonFrame>
  );
}

export function PayrollListPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton />
      <CardShell className="divide-y divide-border">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-5 py-3.5"
          >
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-36 max-w-[60%]" />
              <Skeleton className="h-3 w-24 max-w-[40%]" />
            </div>
            <Skeleton className="hidden h-5 w-20 rounded-md sm:block" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </CardShell>
    </PageSkeletonFrame>
  );
}

export function DevicesPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      <CardShell className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="size-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40 max-w-[55%]" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            </div>
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </CardShell>
    </PageSkeletonFrame>
  );
}

export function OrganisationPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardShell key={index}>
            <div className="space-y-1.5 border-b border-border px-6 py-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
            <div className="flex flex-wrap gap-2 p-6">
              {Array.from({ length: 4 }).map((_, chip) => (
                <Skeleton key={chip} className="h-7 w-24 rounded-md" />
              ))}
            </div>
          </CardShell>
        ))}
      </div>
    </PageSkeletonFrame>
  );
}

export function OrganogramPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton />
      <div className="overflow-x-auto pb-2">
        <div className="mx-auto flex min-w-max flex-col items-center gap-6 py-4">
          <PersonCardSkeleton />
          <Skeleton className="h-6 w-px" />
          <div className="flex items-start gap-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center gap-4">
                <PersonCardSkeleton />
                <Skeleton className="h-6 w-px" />
                <div className="flex gap-4">
                  <PersonCardSkeleton compact />
                  <PersonCardSkeleton compact />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageSkeletonFrame>
  );
}

function PersonCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3",
        compact ? "w-36" : "w-44",
      )}
    >
      <Skeleton className={cn("rounded-full", compact ? "size-10" : "size-12")} />
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

/** Fallback used by the (app) segment when a page has no dedicated skeleton. */
export function AppPageSkeleton() {
  return (
    <PageSkeletonFrame>
      <PageHeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardShell key={index} className="p-5">
            <Skeleton className="mb-4 size-9 rounded-md" />
            <Skeleton className="mb-2 h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-3/5" />
          </CardShell>
        ))}
      </div>
      <TableRowsSkeleton rows={5} />
    </PageSkeletonFrame>
  );
}
