"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreateFundButton, EditFundButton } from "@/components/petty-cash/toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useAsyncAction } from "@/lib/hooks/use-async-action";
import {
  saveCategory,
  saveVendor,
  setCategoryActive,
  updatePettyCashSettings,
} from "@/lib/petty-cash/actions";
import { FUND_STATUS_LABELS } from "@/lib/petty-cash/labels";
import { currencyDisplay, formatPettyCashMoney } from "@/lib/petty-cash/money";
import type { PettyCashBundle } from "@/lib/petty-cash/types";
import { REPORTING_CURRENCIES } from "@/lib/payroll/currencies";

export function PettyCashSettingsForm({
  bundle,
  viewerId,
}: {
  bundle: PettyCashBundle;
  viewerId: string;
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const { settings } = bundle;
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency);
  const [receiptRequiredAbove, setReceiptRequiredAbove] = useState(
    String(settings.receiptRequiredAbove),
  );
  const [maxTransactionAmount, setMaxTransactionAmount] = useState(
    String(settings.maxTransactionAmount),
  );
  const [autoApproveUpTo, setAutoApproveUpTo] = useState(
    String(settings.autoApproveUpTo),
  );
  const [defaultTargetFloat, setDefaultTargetFloat] = useState(
    String(settings.defaultTargetFloat),
  );
  const [defaultReplenishmentThreshold, setDefaultReplenishmentThreshold] =
    useState(String(settings.defaultReplenishmentThreshold));
  const [allowOverLimitException, setAllowOverLimitException] = useState(
    settings.allowOverLimitException,
  );
  const [allowSelfApproval, setAllowSelfApproval] = useState(
    settings.allowSelfApproval,
  );
  const [allowNegativeBalance, setAllowNegativeBalance] = useState(
    settings.allowNegativeBalance,
  );
  const [categoryName, setCategoryName] = useState("");
  const [parentId, setParentId] = useState("none");
  const [vendorName, setVendorName] = useState("");

  const currencies = REPORTING_CURRENCIES.map((code) => ({
    value: code,
    label: currencyDisplay(code),
  }));
  const parents = [
    { value: "none", label: "Top-level category" },
    ...bundle.categories
      .filter((category) => !category.parentId)
      .map((category) => ({ value: category.id, label: category.name })),
  ];

  function saveSettings() {
    void run(async () => {
      const formData = new FormData();
      formData.set("defaultCurrency", defaultCurrency);
      formData.set("receiptRequiredAbove", receiptRequiredAbove);
      formData.set("maxTransactionAmount", maxTransactionAmount);
      formData.set("autoApproveUpTo", autoApproveUpTo);
      formData.set("defaultTargetFloat", defaultTargetFloat);
      formData.set("defaultReplenishmentThreshold", defaultReplenishmentThreshold);
      formData.set("allowOverLimitException", String(allowOverLimitException));
      formData.set("allowSelfApproval", String(allowSelfApproval));
      formData.set("allowNegativeBalance", String(allowNegativeBalance));
      const result = await updatePettyCashSettings(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    });
  }

  function addCategory() {
    void run(async () => {
      const formData = new FormData();
      formData.set("name", categoryName);
      formData.set("parentId", parentId === "none" ? "" : parentId);
      const result = await saveCategory(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Category added");
      setCategoryName("");
      router.refresh();
    });
  }

  function toggleCategory(id: string, isActive: boolean) {
    void run(async () => {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("isActive", String(isActive));
      const result = await setCategoryActive(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function addVendor() {
    void run(async () => {
      const formData = new FormData();
      formData.set("name", vendorName);
      const result = await saveVendor(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Vendor added");
      setVendorName("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Funds</h2>
          <CreateFundButton
            settings={bundle.settings}
            people={bundle.people}
            departments={bundle.departments}
            viewerId={viewerId}
          />
        </div>
        {bundle.funds.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No funds yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {bundle.funds.map((fund) => (
              <li key={fund.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{fund.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {FUND_STATUS_LABELS[fund.status]}
                    {" · "}
                    {formatPettyCashMoney(fund.availableBalance, fund.currency)}
                  </p>
                </div>
                <EditFundButton
                  fund={fund}
                  settings={bundle.settings}
                  people={bundle.people}
                  departments={bundle.departments}
                  viewerId={viewerId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Limits</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Default currency</Label>
            <Select
              value={defaultCurrency}
              onValueChange={(value) => {
                if (value) setDefaultCurrency(value);
              }}
              items={currencies}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberField
            label="Receipt required above"
            value={receiptRequiredAbove}
            onChange={setReceiptRequiredAbove}
          />
          <NumberField
            label="Maximum transaction"
            value={maxTransactionAmount}
            onChange={setMaxTransactionAmount}
          />
          <NumberField
            label="Auto-approve up to"
            value={autoApproveUpTo}
            onChange={setAutoApproveUpTo}
          />
          <NumberField
            label="Default target float"
            value={defaultTargetFloat}
            onChange={setDefaultTargetFloat}
          />
          <NumberField
            label="Default replenishment threshold"
            value={defaultReplenishmentThreshold}
            onChange={setDefaultReplenishmentThreshold}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Toggle
            label="Allow an exception above the maximum"
            checked={allowOverLimitException}
            onChange={setAllowOverLimitException}
          />
          <Toggle
            label="Allow someone to approve their own transaction"
            checked={allowSelfApproval}
            onChange={setAllowSelfApproval}
          />
          <Toggle
            label="Allow a fund balance to go negative"
            checked={allowNegativeBalance}
            onChange={setAllowNegativeBalance}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={saveSettings} disabled={pending}>
            {pending ? <Spinner /> : null}
            Save settings
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Categories</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Group</Label>
            <Select
              value={parentId}
              onValueChange={(value) => {
                if (value) setParentId(value);
              }}
              items={parents}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {parents.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={addCategory} disabled={pending}>
            Add category
          </Button>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {bundle.categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm">
                {category.parentName ? `${category.parentName} / ${category.name}` : category.name}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => toggleCategory(category.id, !category.isActive)}
              >
                {category.isActive ? "Deactivate" : "Activate"}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Vendors</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={vendorName} onChange={(event) => setVendorName(event.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={addVendor} disabled={pending}>
            Add vendor
          </Button>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {bundle.vendors.map((vendor) => (
            <li key={vendor.id} className="py-2.5 text-sm">
              {vendor.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
