import assert from "node:assert/strict";
import test from "node:test";
import {
  cashVariance,
  currencyDisplay,
  expenseShortfall,
  floatFillPercent,
  formatPettyCashMoney,
  postedBalance,
  recommendedReplenishment,
  withRunningBalances,
  type BalanceTransaction,
} from "./money.ts";

function row(
  partial: Pick<BalanceTransaction, "direction" | "amount" | "status"> &
    Partial<BalanceTransaction>,
): BalanceTransaction {
  return {
    id: partial.id ?? "1",
    fundId: partial.fundId ?? "fund",
    direction: partial.direction,
    amount: partial.amount,
    status: partial.status,
    transactionDate: partial.transactionDate ?? "2026-10-06",
    createdAt: partial.createdAt ?? "2026-10-06T00:00:00.000Z",
    transactionNumber: partial.transactionNumber ?? "PC-2026-000001",
  };
}

test("opening balance is the posted cash in", () => {
  assert.equal(
    postedBalance([row({ direction: "in", amount: 700, status: "posted" })]),
    700,
  );
});

test("a single expense reduces the posted balance", () => {
  assert.equal(
    postedBalance([
      row({ id: "a", direction: "in", amount: 700, status: "posted" }),
      row({ id: "b", direction: "out", amount: 92.57, status: "posted" }),
    ]),
    607.43,
  );
});

test("multiple expenses keep cent precision", () => {
  assert.equal(
    postedBalance([
      row({ id: "a", direction: "in", amount: 700, status: "posted" }),
      row({ id: "b", direction: "out", amount: 92.57, status: "posted" }),
      row({ id: "c", direction: "out", amount: 62.95, status: "posted" }),
      row({ id: "d", direction: "out", amount: 85, status: "posted" }),
    ]),
    459.48,
  );
});

test("a top-up increases the posted balance", () => {
  assert.equal(
    postedBalance([
      row({ id: "a", direction: "in", amount: 459.48, status: "posted" }),
      row({ id: "b", direction: "in", amount: 650, status: "posted" }),
    ]),
    1109.48,
  );
});

test("pending and voided rows do not affect the official balance", () => {
  assert.equal(
    postedBalance([
      row({ id: "a", direction: "in", amount: 700, status: "posted" }),
      row({ id: "b", direction: "out", amount: 100, status: "pending_approval" }),
      row({ id: "c", direction: "out", amount: 50, status: "voided" }),
      row({ id: "d", direction: "out", amount: 20, status: "draft" }),
    ]),
    700,
  );
});

test("insufficient cash reports the shortfall", () => {
  assert.equal(expenseShortfall(50, 100), 50);
  assert.equal(expenseShortfall(100, 40), null);
});

test("reconciliation variance is actual minus expected", () => {
  assert.equal(cashVariance(1240, 1230), -10);
  assert.equal(cashVariance(1240.5, 1240.5), 0);
});

test("replenishment tops the fund back up to the target float", () => {
  assert.equal(recommendedReplenishment(2000, 350), 1650);
  assert.equal(recommendedReplenishment(2000, 2000), 0);
});

test("running balance follows posted order and ignores a pending row", () => {
  const rows = withRunningBalances([
    row({
      id: "open",
      direction: "in",
      amount: 700,
      status: "posted",
      transactionNumber: "PC-2026-000001",
      createdAt: "2026-10-06T09:00:00.000Z",
    }),
    row({
      id: "expense",
      direction: "out",
      amount: 92.57,
      status: "posted",
      transactionNumber: "PC-2026-000002",
      createdAt: "2026-10-06T10:00:00.000Z",
    }),
    row({
      id: "pending",
      direction: "out",
      amount: 10,
      status: "pending_approval",
      transactionNumber: "PC-2026-000003",
      createdAt: "2026-10-06T11:00:00.000Z",
    }),
  ]);

  assert.equal(rows.find((entry) => entry.id === "open")?.balance, 700);
  assert.equal(rows.find((entry) => entry.id === "expense")?.balance, 607.43);
  assert.equal(rows.find((entry) => entry.id === "pending")?.balance, null);
});

test("cedis display as GH₵ and other currencies keep their code", () => {
  assert.equal(currencyDisplay("GHS"), "GH₵");
  assert.equal(formatPettyCashMoney(660, "GHS"), "GH₵ 660.00");
  assert.equal(formatPettyCashMoney(10, "usd"), "10.00 USD");
});

test("float fill compares the current balance with the target", () => {
  assert.equal(floatFillPercent(660, 2000), 33);
  assert.equal(floatFillPercent(2500, 2000), 100);
  assert.equal(floatFillPercent(0, 2000), 0);
});
