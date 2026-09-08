"use client";

import { useState } from "react";
import {
  Bug,
  CheckCircle2,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAsyncAction } from "@/lib/hooks/use-async-action";
import { submitSupportRequest } from "@/lib/support/actions";
import {
  SUPPORT_DETAILS_MAX_LENGTH,
  SUPPORT_REQUEST_KINDS,
  SUPPORT_SUBJECT_MAX_LENGTH,
  getSupportRequestKind,
  isSupportRequestKind,
  type SupportRequestKind,
} from "@/lib/support/types";

const KIND_ICONS: Record<SupportRequestKind, LucideIcon> = {
  idea: Lightbulb,
  help: Bug,
};

interface SupportRequestFormProps {
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export function SupportRequestForm({
  onSubmitted,
  onCancel,
}: SupportRequestFormProps) {
  const { pending, run } = useAsyncAction();
  const [kind, setKind] = useState<SupportRequestKind>("idea");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedKind = getSupportRequestKind(kind);
  const canSubmit = Boolean(subject.trim() && details.trim());

  function clearStatus() {
    setError(null);
    setSuccess(null);
  }

  function resetFields() {
    setSubject("");
    setDetails("");
    setKind("idea");
    clearStatus();
  }

  function submit() {
    void run(async () => {
      const result = await submitSupportRequest({ kind, subject, details });

      if (result.error) {
        setError(result.error);
        setSuccess(null);
        return;
      }

      setError(null);
      setSuccess(
        kind === "idea"
          ? "Idea sent."
          : "Bug report sent.",
      );
      resetFields();
      onSubmitted?.();
    });
  }

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="space-y-2">
        <p className="text-sm leading-none font-medium">Type</p>
        <ToggleGroup
          value={[kind]}
          onValueChange={(next) => {
            const [selected] = next;
            if (selected && isSupportRequestKind(selected)) {
              setKind(selected);
              clearStatus();
            }
          }}
          variant="outline"
          spacing={0}
          aria-label="Request type"
          className="w-full"
        >
          {SUPPORT_REQUEST_KINDS.map((option) => {
            const Icon = KIND_ICONS[option.id];
            return (
              <ToggleGroupItem
                key={option.id}
                value={option.id}
                className="flex-1 px-3"
              >
                <Icon className="size-4" />
                {option.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">
          {selectedKind.description}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-subject">Summary</Label>
        <Input
          id="support-subject"
          value={subject}
          maxLength={SUPPORT_SUBJECT_MAX_LENGTH}
          onChange={(event) => {
            setSubject(event.target.value);
            clearStatus();
          }}
          placeholder={
            kind === "help"
              ? "Payslip download fails on Safari"
              : "Add leave balance to the dashboard"
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-details">Details</Label>
        <Textarea
          id="support-details"
          value={details}
          maxLength={SUPPORT_DETAILS_MAX_LENGTH}
          onChange={(event) => {
            setDetails(event.target.value);
            clearStatus();
          }}
          placeholder={selectedKind.detailsPlaceholder}
          className="min-h-32 rounded-md"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="flex items-start gap-2 text-sm text-success" role="status">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {success}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={submit} disabled={!canSubmit || pending}>
          {pending ? <Spinner className="mr-1" /> : null}
          Send request
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={resetFields}
            disabled={pending || !canSubmit}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
