"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createLegalEntity } from "@/lib/org/actions";
import { useAsyncAction } from "@/lib/hooks/use-async-action";
import type { LegalEntityRecord } from "@/lib/payroll/get-legal-entities";

export function LegalEntitiesForm({
  entities,
}: {
  entities: LegalEntityRecord[];
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [name, setName] = useState("");

  const existingNames = useMemo(
    () => new Set(entities.map((entity) => entity.name.toLowerCase())),
    [entities],
  );

  const trimmedName = name.trim();
  const canAdd =
    trimmedName.length > 0 && !existingNames.has(trimmedName.toLowerCase());

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

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {entities.map((entity) => (
          <li key={entity.id} className="px-4 py-3 text-sm">
            {entity.name}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor="legal-entity-name">Add paying entity</Label>
          <Input
            id="legal-entity-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Company name"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
        </div>

        <Button onClick={handleAdd} disabled={pending || !canAdd}>
          {pending ? <Spinner /> : null}
          Add
        </Button>
      </div>
    </div>
  );
}
