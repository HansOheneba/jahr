"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, Laptop, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  assignDevice,
  createDevice,
  returnDevice,
  updateDeviceStatus,
} from "@/lib/devices/actions";
import {
  DEVICE_KIND_OPTIONS,
  DEVICE_STATUS_LABELS,
  type DeviceAssignee,
  type DeviceRecord,
  type DeviceStatus,
} from "@/lib/devices/types";
import { ASSET_KIND_LABELS, type AssetKind } from "@/lib/types/employee";
import { displayName } from "@/lib/types/database";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  // Date-only values (YYYY-MM-DD) parse as UTC midnight; append noon to keep the calendar day.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusTone(status: DeviceStatus): string {
  switch (status) {
    case "available":
      return "border-transparent bg-[color-mix(in_srgb,var(--success)_12%,white)] text-[color:var(--success)]";
    case "assigned":
      return "border-transparent bg-[color-mix(in_srgb,var(--accent-blue)_10%,white)] text-accent-blue";
    case "repair":
      return "border-transparent bg-[color-mix(in_srgb,var(--warning)_16%,white)] text-[#B45309]";
    case "retired":
      return "border-border bg-secondary text-muted-foreground";
    default:
      return "";
  }
}

export function DevicesManager({
  devices,
  employees,
}: {
  devices: DeviceRecord[];
  employees: DeviceAssignee[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [assignDeviceId, setAssignDeviceId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [kind, setKind] = useState<AssetKind>("laptop");
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [purchasedAt, setPurchasedAt] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");

  const [employeeId, setEmployeeId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");

  const assignTarget = useMemo(
    () => devices.find((device) => device.id === assignDeviceId) ?? null,
    [assignDeviceId, devices],
  );

  function refresh() {
    router.refresh();
  }

  function resetAddForm() {
    setKind("laptop");
    setName("");
    setSerialNumber("");
    setManufacturer("");
    setModel("");
    setColor("");
    setPurchasedAt(undefined);
    setNotes("");
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createDevice({
        kind,
        name,
        serialNumber,
        manufacturer,
        model,
        color,
        purchasedAt: purchasedAt ? format(purchasedAt, "yyyy-MM-dd") : undefined,
        notes,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      resetAddForm();
      setAddOpen(false);
      refresh();
    });
  }

  function handleAssign() {
    if (!assignDeviceId || !employeeId) return;
    setError(null);
    startTransition(async () => {
      const result = await assignDevice({
        deviceId: assignDeviceId,
        employeeId,
        notes: assignNotes,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAssignDeviceId(null);
      setEmployeeId("");
      setAssignNotes("");
      refresh();
    });
  }

  function handleReturn(deviceId: string) {
    setError(null);
    startTransition(async () => {
      const result = await returnDevice({ deviceId });
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleStatus(deviceId: string, status: Exclude<DeviceStatus, "assigned">) {
    setError(null);
    startTransition(async () => {
      const result = await updateDeviceStatus({ deviceId, status });
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {devices.length} device{devices.length === 1 ? "" : "s"} in inventory
        </p>

        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetTrigger
            render={<Button className="gap-1.5" />}
          >
            <Plus className="size-4" />
            Add device
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Add device</SheetTitle>
              <SheetDescription>
                Register a company device with its serial number.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2">
              <div className="space-y-2">
                <Label htmlFor="device-kind">Type</Label>
                <Select
                  value={kind}
                  onValueChange={(value) => {
                    if (value) setKind(value as AssetKind);
                  }}
                  items={DEVICE_KIND_OPTIONS.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                >
                  <SelectTrigger id="device-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_KIND_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-name">Name</Label>
                <Input
                  id="device-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="MacBook Pro 14"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-serial">Serial number</Label>
                <Input
                  id="device-serial"
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  placeholder="C02XYZ123456"
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="device-manufacturer">Manufacturer</Label>
                  <Input
                    id="device-manufacturer"
                    value={manufacturer}
                    onChange={(event) => setManufacturer(event.target.value)}
                    placeholder="Apple"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-model">Model</Label>
                  <Input
                    id="device-model"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder="M3 Pro"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="device-color">Colour</Label>
                  <Input
                    id="device-color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    placeholder="Space Black"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-purchased">Purchased</Label>
                  <DatePicker
                    id="device-purchased"
                    value={purchasedAt}
                    onChange={setPurchasedAt}
                    placeholder="Purchase date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-notes">Notes</Label>
                <Textarea
                  id="device-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional"
                  rows={3}
                />
              </div>
            </div>

            <SheetFooter>
              {error && addOpen ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <Button
                onClick={handleCreate}
                disabled={pending || !name.trim() || !serialNumber.trim()}
                className="gap-2"
              >
                {pending ? <Spinner /> : null}
                Save device
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {error && !addOpen && !assignDeviceId ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {devices.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
          <Laptop className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No devices yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a laptop, phone, or other company asset to start tracking it.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          {devices.map((device) => {
            const assignee = device.current_assignment?.employee;
            const expanded = expandedId === device.id;

            return (
              <li
                key={device.id}
                className="border-b border-border last:border-b-0"
              >
                <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium tracking-tight">
                        {device.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("rounded-md font-normal", statusTone(device.status))}
                      >
                        {DEVICE_STATUS_LABELS[device.status]}
                      </Badge>
                      <Badge variant="outline" className="rounded-md font-normal">
                        {ASSET_KIND_LABELS[device.kind]}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {device.serial_number}
                      {device.manufacturer || device.model
                        ? ` · ${[device.manufacturer, device.model].filter(Boolean).join(" ")}`
                        : ""}
                      {device.color ? ` · ${device.color}` : ""}
                    </p>
                    {assignee ? (
                      <div className="flex items-center gap-2 pt-1">
                        <UserAvatar
                          name={displayName(assignee)}
                          src={assignee.avatar_url}
                          gender={assignee.gender}
                          size="sm"
                        />
                        <p className="truncate text-sm text-muted-foreground">
                          {displayName(assignee)}
                          {assignee.job_title ? ` · ${assignee.job_title}` : ""}
                        </p>
                      </div>
                    ) : (
                      <p className="pt-1 text-sm text-muted-foreground">
                        Unassigned
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {device.status === "assigned" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleReturn(device.id)}
                      >
                        Return
                      </Button>
                    ) : device.status !== "retired" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setError(null);
                          setAssignDeviceId(device.id);
                        }}
                      >
                        Assign
                      </Button>
                    ) : null}

                    {device.status === "available" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => handleStatus(device.id, "repair")}
                      >
                        Mark repair
                      </Button>
                    ) : null}
                    {device.status === "repair" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => handleStatus(device.id, "available")}
                      >
                        Mark available
                      </Button>
                    ) : null}
                    {device.status !== "assigned" && device.status !== "retired" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => handleStatus(device.id, "retired")}
                      >
                        Retire
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() =>
                        setExpandedId(expanded ? null : device.id)
                      }
                    >
                      Details
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </Button>
                  </div>
                </div>

                {expanded ? (
                  <div className="space-y-4 border-t border-border bg-[#FBFCFE] px-4 py-3">
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-[11px] text-muted-foreground">
                          Colour
                        </dt>
                        <dd className="text-sm">{device.color ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">
                          Added
                        </dt>
                        <dd className="text-sm">
                          {formatDate(device.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">
                          Purchased
                        </dt>
                        <dd className="text-sm">
                          {formatDate(device.purchased_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">
                          Notes
                        </dt>
                        <dd className="text-sm">{device.notes ?? "-"}</dd>
                      </div>
                    </dl>

                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground">
                        Assignment history
                      </p>
                      {device.history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No assignment history yet.
                        </p>
                      ) : (
                        <ol className="space-y-3">
                          {device.history.map((entry) => (
                            <li
                              key={entry.id}
                              className="flex gap-3 text-sm"
                            >
                              <UserAvatar
                                name={
                                  entry.employee
                                    ? displayName(entry.employee)
                                    : "Unknown"
                                }
                                src={entry.employee?.avatar_url}
                                gender={entry.employee?.gender}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {entry.employee
                                    ? displayName(entry.employee)
                                    : "Unknown employee"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatWhen(entry.assigned_at)}
                                  {" → "}
                                  {entry.returned_at
                                    ? formatWhen(entry.returned_at)
                                    : "present"}
                                  {entry.assigned_by_name
                                    ? ` · by ${entry.assigned_by_name}`
                                    : ""}
                                </p>
                                {entry.notes ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {entry.notes}
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={Boolean(assignDeviceId)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDeviceId(null);
            setEmployeeId("");
            setAssignNotes("");
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assign device</SheetTitle>
            <SheetDescription>
              {assignTarget
                ? `${assignTarget.name} · ${assignTarget.serial_number}`
                : "Choose who should receive this device."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={employeeId || null}
                onValueChange={(value) => {
                  if (value) setEmployeeId(value);
                }}
                items={employees.map((employee) => ({
                  value: employee.id,
                  label: displayName(employee),
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {displayName(employee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assign-notes">Notes</Label>
              <Textarea
                id="assign-notes"
                value={assignNotes}
                onChange={(event) => setAssignNotes(event.target.value)}
                placeholder="Optional handover notes"
                rows={3}
              />
            </div>
          </div>

          <SheetFooter>
            {error && assignDeviceId ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button
              onClick={handleAssign}
              disabled={pending || !employeeId}
              className="gap-2"
            >
              {pending ? <Spinner /> : null}
              Assign
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
