"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAsyncAction } from "@/lib/hooks/use-async-action";
import {
  createLegalEntity,
  deleteLegalEntity,
  updateLegalEntity,
} from "@/lib/org/actions";
import type { LegalEntityRecord } from "@/lib/payroll/get-legal-entities";
import { isPersistedLegalEntity } from "@/lib/payroll/legal-entities";

function peopleLabel(count: number): string {
  return count === 1 ? "1 pay package" : `${count} pay packages`;
}

export function LegalEntitiesForm({
  entities,
}: {
  entities: LegalEntityRecord[];
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LegalEntityRecord | null>(
    null,
  );

  const existingNames = useMemo(
    () => new Set(entities.map((entity) => entity.name.toLowerCase())),
    [entities],
  );

  const trimmedName = name.trim();
  const canAdd =
    trimmedName.length > 0 && !existingNames.has(trimmedName.toLowerCase());

  const trimmedEditingName = editingName.trim();
  const editingEntity = entities.find((entity) => entity.id === editingId);
  const canSaveEdit =
    Boolean(editingEntity) &&
    trimmedEditingName.length > 0 &&
    (trimmedEditingName === editingEntity?.name ||
      !existingNames.has(trimmedEditingName.toLowerCase()));

  function handleAdd() {
    if (!canAdd) return;

    void run(async () => {
      const result = await createLegalEntity(trimmedName);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Paying entity added");
      setName("");
      router.refresh();
    });
  }

  function startEditing(entity: LegalEntityRecord) {
    setEditingId(entity.id);
    setEditingName(entity.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  function handleSaveEdit() {
    if (!editingId || !canSaveEdit) return;

    void run(async () => {
      const result = await updateLegalEntity({
        id: editingId,
        name: trimmedEditingName,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Paying entity updated");
      cancelEditing();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;

    void run(async () => {
      const result = await deleteLegalEntity(deleteTarget.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Paying entity removed");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {entities.map((entity) => {
          const isEditing = editingId === entity.id;
          const persisted = isPersistedLegalEntity(entity.id);

          return (
            <li
              key={entity.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              {isEditing ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    aria-label="Paying entity name"
                    className="min-w-56 flex-1"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSaveEdit();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEditing();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={pending || !canSaveEdit}
                  >
                    {pending ? <Spinner /> : null}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEditing}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="text-sm">{entity.name}</span>
                    {entity.usageCount > 0 ? (
                      <Badge variant="outline" className="rounded-md font-normal">
                        {peopleLabel(entity.usageCount)}
                      </Badge>
                    ) : null}
                  </div>

                  {persisted ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${entity.name}`}
                        disabled={pending || editingId !== null}
                        onClick={() => startEditing(entity)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${entity.name}`}
                        disabled={pending || editingId !== null}
                        onClick={() => setDeleteTarget(entity)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor="legal-entity-name">Add paying entity</Label>
          <Input
            id="legal-entity-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Company name"
            disabled={pending || editingId !== null}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
        </div>

        <Button
          onClick={handleAdd}
          disabled={pending || !canAdd || editingId !== null}
        >
          {pending && !editingId && !deleteTarget ? <Spinner /> : null}
          Add
        </Button>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove paying entity?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? deleteTarget.usageCount > 0
                  ? `${peopleLabel(deleteTarget.usageCount)} still use ${deleteTarget.name}. Reassign them before removing it.`
                  : `${deleteTarget.name} will be removed from pay package options.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending || (deleteTarget?.usageCount ?? 0) > 0}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {pending ? <Spinner /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
