import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const widthClasses = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-none",
} as const;

type FormPageWidth = keyof typeof widthClasses;

export function FormPageShell({
  children,
  className,
  width = "md",
}: {
  children: ReactNode;
  className?: string;
  width?: FormPageWidth;
}) {
  return (
    <div
      className={cn(
        "form-page-shell relative -mx-4 -my-5 min-h-[calc(100svh-3rem)] px-4 py-5 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
        className,
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex w-full flex-1 flex-col gap-5",
          widthClasses[width],
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function FormPageCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("form-page-card", className)}>{children}</div>;
}
