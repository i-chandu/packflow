"use client";

import { useActionState } from "react";
import type { SupplierBillFormState } from "@/app/actions/supplier-bills";
import { ErrorAlert } from "@/components/shared/error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { centsToRupees } from "@/lib/money";
import type { Supplier, SupplierBill } from "@prisma/client";

export function SupplierBillForm({
  suppliers,
  bill,
  defaultSupplierId,
  action,
  submitLabel,
}: {
  suppliers: Pick<Supplier, "id" | "name">[];
  bill?: SupplierBill;
  defaultSupplierId?: string;
  action: (
    prev: SupplierBillFormState,
    formData: FormData,
  ) => Promise<SupplierBillFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error && <ErrorAlert message={state.error} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="supplierId">Supplier *</Label>
          <Select
            id="supplierId"
            name="supplierId"
            required
            defaultValue={bill?.supplierId ?? defaultSupplierId ?? ""}
            disabled={Boolean(bill)}
          >
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="billNumber">Bill number *</Label>
          <Input
            id="billNumber"
            name="billNumber"
            required
            defaultValue={bill?.billNumber ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            name="reference"
            defaultValue={bill?.reference ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="billDate">Bill date *</Label>
          <Input
            id="billDate"
            name="billDate"
            type="date"
            required
            defaultValue={
              bill?.billDate
                ? new Date(bill.billDate).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={
              bill?.dueDate
                ? new Date(bill.dueDate).toISOString().slice(0, 10)
                : ""
            }
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="amount">Amount (₹) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={
              bill ? centsToRupees(bill.grandTotalCents) : ""
            }
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={bill?.notes ?? ""}
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
