"use client";

import { useEffect, useState, useTransition } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  previewAnnouncementAudience,
  publishAnnouncement,
} from "@/lib/announcements/actions";
import type { WorkType } from "@/lib/types/employee";
import { cn } from "@/lib/utils";

const WORK_TYPE_OPTIONS: Array<{ value: WorkType; label: string }> = [
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

interface CommsComposerFormProps {
  businessUnits: Array<{ id: string; name: string }>;
}

export function CommsComposerForm({ businessUnits }: CommsComposerFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [businessUnitIds, setBusinessUnitIds] = useState<string[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [counting, startCountTransition] = useTransition();

  useEffect(() => {
    startCountTransition(async () => {
      const result = await previewAnnouncementAudience({
        businessUnitIds,
        workTypes,
      });
      if (!result.error) {
        setAudienceCount(result.count);
      }
    });
  }, [businessUnitIds, workTypes]);

  function toggleBusinessUnit(id: string) {
    setBusinessUnitIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleWorkType(value: WorkType) {
    setWorkTypes((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function handlePublish() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await publishAnnouncement({
        title,
        body,
        businessUnitIds,
        workTypes,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setTitle("");
      setBody("");
      setBusinessUnitIds([]);
      setWorkTypes([]);
      setSuccess(
        `Published to ${result.recipientCount ?? 0} recipient${
          result.recipientCount === 1 ? "" : "s"
        }.`,
      );
    });
  }

  const audienceLabel =
    businessUnitIds.length === 0 && workTypes.length === 0
      ? "Entire company"
      : [
          businessUnitIds.length === 0
            ? "All business units"
            : `${businessUnitIds.length} business unit${
                businessUnitIds.length === 1 ? "" : "s"
              }`,
          workTypes.length === 0
            ? "all work types"
            : workTypes
                .map(
                  (type) =>
                    WORK_TYPE_OPTIONS.find((option) => option.value === type)
                      ?.label ?? type,
                )
                .join(", "),
        ].join(" · ");

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,#55A8FD_12%,white)] text-[#55A8FD]">
          <Megaphone className="size-4" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium">New announcement</h2>
          <p className="text-xs text-muted-foreground">
            Same message goes to email and the dashboard Internal Comms feed.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <Label htmlFor="comms-title">Title</Label>
          <Input
            id="comms-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Office closed Friday"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="comms-body">Message</Label>
          <Textarea
            id="comms-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write the announcement…"
            className="min-h-36 rounded-md"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label>Business units</Label>
          <p className="text-xs text-muted-foreground">
            Leave none selected to include every business unit.
          </p>
          <div className="flex flex-wrap gap-2">
            {businessUnits.map((unit) => {
              const selected = businessUnitIds.includes(unit.id);
              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => toggleBusinessUnit(unit.id)}
                  disabled={pending}
                  className={cn(
                    "inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors",
                    selected
                      ? "border-[#0070F3] bg-[color-mix(in_srgb,#0070F3_8%,white)] text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  {unit.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Work type</Label>
          <p className="text-xs text-muted-foreground">
            Leave none selected to include onsite, hybrid, and remote.
          </p>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPE_OPTIONS.map((option) => {
              const selected = workTypes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleWorkType(option.value)}
                  disabled={pending}
                  className={cn(
                    "inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors",
                    selected
                      ? "border-[#0070F3] bg-[color-mix(in_srgb,#0070F3_8%,white)] text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-border bg-secondary/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">Audience</p>
          <p className="mt-0.5 text-sm font-medium">{audienceLabel}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            {counting || audienceCount === null ? (
              <Spinner className="size-3" />
            ) : (
              `${audienceCount} active employee${
                audienceCount === 1 ? "" : "s"
              } with email`
            )}
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-[#16A34A]" role="status">
            {success}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handlePublish}
            disabled={pending || !title.trim() || !body.trim()}
            className="gap-2"
          >
            {pending ? <Spinner /> : <Megaphone className="size-4" />}
            Publish announcement
          </Button>
        </div>
      </div>
    </div>
  );
}
