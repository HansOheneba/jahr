"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { UserMinus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { offboardEmployee } from "@/lib/employees/actions";

export function OffboardEmployeeDialog({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [terminationDate, setTerminationDate] = useState<Date | undefined>(
    new Date(),
  );
  const [leavingReason, setLeavingReason] = useState("");

  function handleOffboard() {
    setError(null);
    startTransition(async () => {
      const result = await offboardEmployee({
        employeeId,
        terminationDate: terminationDate
          ? format(terminationDate, "yyyy-MM-dd")
          : "",
        leavingReason,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.push("/admin/alumni");
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" className="gap-1.5" />
        }
      >
        <UserMinus className="size-3.5" />
        Offboard
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Offboard {employeeName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This marks them as terminated and moves them to Alumni. They will
            no longer appear in the active employees directory.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Last day</Label>
            <DatePicker
              value={terminationDate}
              onChange={setTerminationDate}
              placeholder="Termination date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leaving-reason">Reason for leaving</Label>
            <Input
              id="leaving-reason"
              value={leavingReason}
              onChange={(event) => setLeavingReason(event.target.value)}
              placeholder="Resignation, end of contract, …"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !leavingReason.trim()}
            onClick={handleOffboard}
            className="gap-2"
          >
            {pending ? <Spinner /> : null}
            Move to Alumni
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
