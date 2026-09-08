"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportingLineView } from "@/components/settings/reporting-line-view";
import { SettingsForm } from "@/components/settings/settings-form";
import type { ReportingLineContext } from "@/lib/employees/get-reporting-context";
import type { EmployeeProfile } from "@/lib/types/employee";
import { cn } from "@/lib/utils";

type SettingsTab = "general" | "team";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "team", label: "Your team" },
];

const SECTION_COPY: Record<SettingsTab, { title: string; description: string }> =
  {
    general: {
      title: "Profile",
      description: "Update your photo, name, and contact details.",
    },
    team: {
      title: "Your team",
      description: "See your reporting line and the people you work with.",
    },
  };

function tabFromLocation(): SettingsTab {
  if (typeof window === "undefined") {
    return "general";
  }
  return new URLSearchParams(window.location.search).get("tab") === "team"
    ? "team"
    : "general";
}

export function SettingsWorkspace({
  profile,
  teamContext,
  initialTab,
}: {
  profile: EmployeeProfile;
  teamContext: ReportingLineContext;
  initialTab: SettingsTab;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const switchTab = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    const url = tab === "team" ? "/settings?tab=team" : "/settings";
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    function syncTabFromHistory() {
      setActiveTab(tabFromLocation());
    }

    window.addEventListener("popstate", syncTabFromHistory);
    return () => window.removeEventListener("popstate", syncTabFromHistory);
  }, []);

  const copy = SECTION_COPY[activeTab];

  return (
    <>
      <div className="shrink-0 space-y-4 px-6 pt-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>

        <nav className="flex gap-1 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                activeTab === tab.id
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="relative flex-1">
        <div
          className={cn(
            activeTab === "general" ? "block" : "hidden",
            "h-full overflow-y-auto p-6",
          )}
          aria-hidden={activeTab !== "general"}
        >
          <SettingsForm profile={profile} />
        </div>

        <div
          className={cn(activeTab === "team" ? "block" : "hidden", "h-full")}
          aria-hidden={activeTab !== "team"}
        >
          <ReportingLineView context={teamContext} />
        </div>
      </div>
    </>
  );
}
