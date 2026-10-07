import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyIllustrationKind =
  | "ideas"
  | "announcements"
  | "documents"
  | "leave"
  | "people"
  | "alumni"
  | "devices"
  | "payroll"
  | "search"
  | "inbox"
  | "permit"
  | "org"
  | "cash";

function Frame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="100" cy="66" r="54" fill="#F5F7FB" />
      <ellipse cx="100" cy="124" rx="48" ry="6" fill="#E7EDF5" />
      {children}
    </svg>
  );
}

function Spark({
  cx,
  cy,
  color = "#0070F3",
}: {
  cx: string;
  cy: string;
  color?: string;
}) {
  return (
    <path
      d="M0-4.2 1-1 4.2 0 1 1 0 4.2-1 1-4.2 0-1-1Z"
      fill={color}
      transform={`translate(${cx} ${cy})`}
    />
  );
}

function IdeasArt() {
  return (
    <>
      <rect
        x="96"
        y="52"
        width="62"
        height="58"
        rx="8"
        fill="#FFF6E0"
        stroke="#F3D48A"
        transform="rotate(7 127 81)"
      />
      <rect
        x="48"
        y="58"
        width="78"
        height="58"
        rx="8"
        fill="white"
        stroke="#E3E8EF"
      />
      <rect x="60" y="84" width="40" height="3.5" rx="1.75" fill="#E3E8EF" />
      <rect x="60" y="92" width="28" height="3.5" rx="1.75" fill="#EEF2F7" />
      <rect x="60" y="100" width="34" height="3.5" rx="1.75" fill="#EEF2F7" />
      <circle cx="78" cy="46" r="16" fill="#FFF4D6" stroke="#F6B93B" strokeWidth="1.75" />
      <path
        d="M72 48c0-5 2.6-8 6-8s6 3 6 8"
        stroke="#E09A12"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M74 46h8" stroke="#E09A12" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="72" y="60" width="12" height="4.5" rx="1.2" fill="#F6B93B" />
      <rect x="74" y="64.5" width="8" height="2.5" rx="1" fill="#D4920E" />
      <Spark cx="138" cy="36" />
      <Spark cx="40" cy="52" color="#55A8FD" />
    </>
  );
}

function AnnouncementsArt() {
  return (
    <>
      <rect x="40" y="46" width="78" height="62" rx="10" fill="white" stroke="#E3E8EF" />
      <rect x="52" y="62" width="40" height="4" rx="2" fill="#E3E8EF" />
      <rect x="52" y="72" width="28" height="4" rx="2" fill="#EEF2F7" />
      <rect x="52" y="82" width="34" height="4" rx="2" fill="#EEF2F7" />
      <path d="M108 58h14l22-14v48l-22-14h-14z" fill="#55A8FD" />
      <rect x="100" y="60" width="12" height="16" rx="3" fill="#3B93F0" />
      <path
        d="M108 76l-6 14"
        stroke="#174EA6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M150 50c8 8 8 24 0 32"
        stroke="#55A8FD"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M158 44c12 12 12 36 0 48"
        stroke="#55A8FD"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </>
  );
}

function DocumentsArt() {
  return (
    <>
      <rect
        x="78"
        y="28"
        width="68"
        height="84"
        rx="8"
        fill="#EAF3FF"
        stroke="#D3E6FB"
        transform="rotate(8 112 70)"
      />
      <rect x="46" y="32" width="76" height="86" rx="8" fill="white" stroke="#E3E8EF" />
      <path d="M94 32h20a8 8 0 0 1 8 8v16H102a8 8 0 0 1-8-8V32z" fill="#EAF3FF" />
      <path d="M94 32v16a8 8 0 0 0 8 8h20" stroke="#C5D9F2" />
      <rect x="58" y="68" width="40" height="3.5" rx="1.75" fill="#E3E8EF" />
      <rect x="58" y="78" width="48" height="3.5" rx="1.75" fill="#EEF2F7" />
      <rect x="58" y="88" width="32" height="3.5" rx="1.75" fill="#EEF2F7" />
      <rect x="58" y="98" width="22" height="3.5" rx="1.75" fill="#D6E6FA" />
    </>
  );
}

function LeaveArt() {
  return (
    <>
      <circle cx="156" cy="30" r="9" fill="#FFF4D6" stroke="#F6B93B" strokeWidth="1.5" />
      <rect x="52" y="32" width="92" height="82" rx="10" fill="white" stroke="#E3E8EF" />
      <path
        d="M62 32h72a10 10 0 0 1 10 10v12H52V42a10 10 0 0 1 10-10z"
        fill="#2EC4B6"
      />
      <rect x="70" y="26" width="4" height="14" rx="2" fill="#171717" />
      <rect x="122" y="26" width="4" height="14" rx="2" fill="#171717" />
      {[0, 1, 2, 3].map((col) =>
        [0, 1, 2].map((row) => {
          const active = col === 2 && row === 1;
          return (
            <rect
              key={`${col}-${row}`}
              x={66 + col * 18}
              y={64 + row * 14}
              width="12"
              height="8"
              rx="2"
              fill={active ? "#2EC4B6" : "#EEF2F7"}
            />
          );
        }),
      )}
    </>
  );
}

function PeopleArt() {
  return (
    <>
      <circle cx="124" cy="58" r="14" fill="#EAF3FF" stroke="#55A8FD" strokeWidth="1.5" />
      <path
        d="M100 112c3-20 14-30 24-30s21 10 24 30"
        fill="#EAF3FF"
        stroke="#55A8FD"
        strokeWidth="1.5"
      />
      <circle cx="82" cy="62" r="16" fill="white" stroke="#171717" strokeWidth="1.6" />
      <path
        d="M52 116c4-24 16-36 30-36s26 12 30 36"
        fill="white"
        stroke="#171717"
        strokeWidth="1.6"
      />
      <Spark cx="150" cy="40" />
    </>
  );
}

function AlumniArt() {
  return (
    <>
      <rect x="54" y="64" width="92" height="50" rx="8" fill="white" stroke="#E3E8EF" />
      <circle cx="76" cy="86" r="11" fill="#E6FAF7" />
      <rect x="96" y="78" width="36" height="4" rx="2" fill="#E3E8EF" />
      <rect x="96" y="88" width="24" height="3.5" rx="1.75" fill="#EEF2F7" />
      <path d="M100 24 136 40 100 56 64 40Z" fill="#2EC4B6" />
      <path d="M100 56v8" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="66" r="2.5" fill="#0F766E" />
      <path
        d="M118 40v16"
        stroke="#0F766E"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="118" cy="58" r="2.2" fill="#F6B93B" />
    </>
  );
}

function DevicesArt() {
  return (
    <>
      <rect x="54" y="32" width="92" height="60" rx="7" fill="#171717" />
      <rect x="60" y="38" width="80" height="48" rx="3" fill="#F5F7FB" />
      <rect x="68" y="48" width="30" height="4" rx="2" fill="#0070F3" />
      <rect x="68" y="58" width="52" height="3.5" rx="1.75" fill="#E3E8EF" />
      <rect x="68" y="66" width="38" height="3.5" rx="1.75" fill="#E3E8EF" />
      <path d="M42 94h116l-8 12H50z" fill="#E3E8EF" />
      <rect x="40" y="92" width="120" height="6" rx="2" fill="#D7DDE6" />
    </>
  );
}

function PayrollArt() {
  return (
    <>
      <rect x="60" y="24" width="80" height="96" rx="8" fill="white" stroke="#E3E8EF" />
      <path d="M68 24h64a8 8 0 0 1 8 8v12H60V32a8 8 0 0 1 8-8z" fill="#FF7A59" />
      <rect x="74" y="56" width="36" height="4" rx="2" fill="#E3E8EF" />
      <rect x="74" y="68" width="52" height="10" rx="3" fill="#FFF1EC" />
      <rect x="74" y="86" width="40" height="3.5" rx="1.75" fill="#E3E8EF" />
      <rect x="74" y="96" width="28" height="3.5" rx="1.75" fill="#EEF2F7" />
      <rect x="74" y="106" width="18" height="3.5" rx="1.75" fill="#FFD5C8" />
    </>
  );
}

function SearchArt() {
  return (
    <>
      <rect x="40" y="38" width="74" height="70" rx="8" fill="white" stroke="#E3E8EF" />
      <rect x="52" y="54" width="40" height="3.5" rx="1.75" fill="#E3E8EF" />
      <rect x="52" y="64" width="28" height="3.5" rx="1.75" fill="#EEF2F7" />
      <rect x="52" y="74" width="34" height="3.5" rx="1.75" fill="#EEF2F7" />
      <circle cx="122" cy="78" r="20" fill="white" stroke="#171717" strokeWidth="2.5" />
      <circle cx="122" cy="78" r="11" fill="#EAF3FF" />
      <path
        d="M136 92l16 16"
        stroke="#171717"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  );
}

function InboxArt() {
  return (
    <>
      <rect x="46" y="58" width="72" height="50" rx="8" fill="white" stroke="#E3E8EF" />
      <rect x="58" y="72" width="36" height="3.5" rx="1.75" fill="#E3E8EF" />
      <rect x="58" y="82" width="24" height="3.5" rx="1.75" fill="#EEF2F7" />
      <path
        d="M132 34c-14 0-22 10-22 24v8l-6 8h56l-6-8v-8c0-14-8-24-22-24z"
        fill="white"
        stroke="#171717"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M124 76a8 8 0 0 0 16 0"
        stroke="#171717"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="154" cy="36" r="7" fill="#0070F3" />
    </>
  );
}

function PermitArt() {
  return (
    <>
      <rect x="36" y="40" width="128" height="74" rx="10" fill="white" stroke="#E3E8EF" />
      <path d="M46 40h8v74h-8a10 10 0 0 1-10-10V50a10 10 0 0 1 10-10z" fill="#0070F3" />
      <circle cx="86" cy="72" r="16" fill="#EAF3FF" />
      <circle cx="86" cy="68" r="6" fill="#55A8FD" />
      <path d="M74 86c2-8 8-12 12-12s10 4 12 12" fill="#55A8FD" />
      <rect x="112" y="58" width="38" height="4" rx="2" fill="#171717" />
      <rect x="112" y="70" width="30" height="3.5" rx="1.75" fill="#E3E8EF" />
      <rect x="112" y="80" width="22" height="3.5" rx="1.75" fill="#EEF2F7" />
    </>
  );
}

function CashArt() {
  return (
    <>
      <circle cx="68" cy="42" r="14" fill="#FFF6E0" stroke="#F6B93B" strokeWidth="1.5" />
      <circle cx="68" cy="42" r="8" stroke="#E09A12" strokeWidth="1.25" />
      <path d="M68 36.5v11" stroke="#E09A12" strokeWidth="1.25" strokeLinecap="round" />
      <rect x="44" y="60" width="112" height="50" rx="8" fill="white" stroke="#E3E8EF" />
      <path d="M44 76h112" stroke="#E3E8EF" />
      <rect x="88" y="66" width="24" height="18" rx="4" fill="#171717" />
      <circle cx="100" cy="75" r="3" fill="#F6B93B" />
      <rect x="56" y="86" width="26" height="14" rx="2" fill="#E7F6EF" />
      <rect x="88" y="86" width="26" height="14" rx="2" fill="#FFF4D6" />
      <rect x="120" y="86" width="26" height="14" rx="2" fill="#EAF3FF" />
      <Spark cx="146" cy="36" />
    </>
  );
}

function OrgArt() {
  return (
    <>
      <path
        d="M100 52v16M100 68H64v16M100 68h36v16"
        stroke="#D7DDE6"
        strokeWidth="1.75"
      />
      <circle cx="100" cy="40" r="14" fill="#0070F3" />
      <circle cx="64" cy="96" r="14" fill="white" stroke="#171717" strokeWidth="1.6" />
      <circle cx="136" cy="96" r="14" fill="white" stroke="#171717" strokeWidth="1.6" />
    </>
  );
}

const ART: Record<EmptyIllustrationKind, () => ReactNode> = {
  ideas: IdeasArt,
  announcements: AnnouncementsArt,
  documents: DocumentsArt,
  leave: LeaveArt,
  people: PeopleArt,
  alumni: AlumniArt,
  devices: DevicesArt,
  payroll: PayrollArt,
  search: SearchArt,
  inbox: InboxArt,
  permit: PermitArt,
  org: OrgArt,
  cash: CashArt,
};

export function EmptyIllustration({
  kind,
  className,
}: {
  kind: EmptyIllustrationKind;
  className?: string;
}) {
  const Art = ART[kind];
  return (
    <Frame className={className}>
      <Art />
    </Frame>
  );
}

export function EmptyState({
  kind,
  title,
  description,
  action,
  size = "default",
  surface = false,
  className,
}: {
  kind: EmptyIllustrationKind;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: "default" | "compact";
  surface?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "default" ? "px-6 py-8" : "px-4 py-6",
        surface && "rounded-xl border border-border bg-card",
        className,
      )}
    >
      <EmptyIllustration
        kind={kind}
        className={size === "default" ? "h-[104px] w-[148px]" : "h-[78px] w-[112px]"}
      />
      <p className="mt-4 text-sm font-medium tracking-tight">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
