"use client";

import { useActionState } from "react";
import type { PaymentFormState } from "@/app/actions/payments";
import { ErrorAlert } from "@/components/shared/error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatINR, centsToRupees } from "@/lib/money";

const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

type PartyOption = { id: string; name: string };

type AllocationOption = {
  id: string;
  label: string;
  balanceDueCents: bigint;
};

export function InboundPaymentForm({
  customers,
  invoices,
  defaultCustomerId,
  defaultInvoiceId,
  defaultAmount,
  action,
}: {
  customers: PartyOption[];
  invoices: AllocationOption[];
  defaultCustomerId?: string;
  defaultInvoiceId?: string;
  defaultAmount?: bigint;
  action: (
    prev: PaymentFormState,
    formData: FormData,
  ) => Promise<PaymentFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error && <ErrorAlert message={state.error} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="customerId">Client *</Label>
          <Select
            id="customerId"
            name="customerId"
            required
            defaultValue={defaultCustomerId ?? ""}
          >
            <option value="">Select client…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoiceId">Allocate to invoice</Label>
          <Select
            id="invoiceId"
            name="invoiceId"
            defaultValue={defaultInvoiceId ?? ""}
          >
            <option value="">Unallocated / select later</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.label} — balance {formatINR(inv.balanceDueCents)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentDate">Payment date *</Label>
          <Input
            id="paymentDate"
            name="paymentDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₹) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={
              defaultAmount !== undefined ? centsToRupees(defaultAmount) : ""
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <Select id="method" name="method" defaultValue="bank_transfer">
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" name="reference" placeholder="UTR, cheque no." />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}

export function OutboundPaymentForm({
  suppliers,
  bills,
  defaultSupplierId,
  defaultBillId,
  defaultAmount,
  action,
}: {
  suppliers: PartyOption[];
  bills: AllocationOption[];
  defaultSupplierId?: string;
  defaultBillId?: string;
  defaultAmount?: bigint;
  action: (
    prev: PaymentFormState,
    formData: FormData,
  ) => Promise<PaymentFormState>;
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
            defaultValue={defaultSupplierId ?? ""}
          >
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="supplierBillId">Allocate to bill</Label>
          <Select
            id="supplierBillId"
            name="supplierBillId"
            defaultValue={defaultBillId ?? ""}
          >
            <option value="">Unallocated</option>
            {bills.map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.label} — balance {formatINR(bill.balanceDueCents)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentDate">Payment date *</Label>
          <Input
            id="paymentDate"
            name="paymentDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₹) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={
              defaultAmount !== undefined ? centsToRupees(defaultAmount) : ""
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <Select id="method" name="method" defaultValue="bank_transfer">
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" name="reference" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record supplier payment"}
      </Button>
    </form>
  );
}
