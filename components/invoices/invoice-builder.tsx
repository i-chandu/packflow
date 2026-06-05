"use client";

import { useMemo, useState, useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InvoiceFormState } from "@/app/actions/invoices";
import { quickCreateClient, quickCreateProduct } from "@/app/actions/invoices";
import { ErrorAlert } from "@/components/shared/error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { formatINR, centsToRupees } from "@/lib/money";
import type { InvoiceLineInput } from "@/lib/validations/invoice";
import type { Invoice, InvoiceLine } from "@prisma/client";

type CustomerOption = { id: string; name: string; phone: string | null };
type ProductOption = {
  id: string;
  name: string;
  lengthMm: string | number | { toString(): string };
  widthMm: string | number | { toString(): string };
  heightMm: string | number | { toString(): string };
  ply: string | null;
  sellingRateCents: bigint;
  purchaseRateCents: bigint;
};

type BuilderInvoice = Pick<
  Invoice,
  "id" | "customerId" | "invoiceDate" | "dueDate" | "notes"
> & {
  lines?: InvoiceLine[];
};

function emptyLine(): InvoiceLineInput {
  return {
    lineType: "product",
    productId: "",
    description: "",
    quantity: 1,
    rate: 0,
    customChargeLabel: "",
  };
}

const BUILDER_LINE_TYPES = [
  "product",
  "transport",
  "loading_unloading",
  "custom",
] as const;

function linesFromInvoice(lines: InvoiceLine[]): InvoiceLineInput[] {
  return lines.map((l) => {
    const lineType = BUILDER_LINE_TYPES.includes(
      l.lineType as (typeof BUILDER_LINE_TYPES)[number],
    )
      ? (l.lineType as InvoiceLineInput["lineType"])
      : "custom";
    return {
      lineType,
      productId: l.productId ?? "",
      description: l.description,
      quantity: Number(l.quantity),
      rate: centsToRupees(l.sellingRateCents),
      customChargeLabel: l.customChargeLabel ?? "",
    };
  });
}

export function InvoiceBuilder({
  orgSlug,
  customers: initialCustomers,
  products: initialProducts,
  invoice,
  saveAction,
  issueAction,
}: {
  orgSlug: string;
  customers: CustomerOption[];
  products: ProductOption[];
  invoice?: BuilderInvoice;
  saveAction: (
    prev: InvoiceFormState,
    formData: FormData,
  ) => Promise<InvoiceFormState>;
  issueAction: (
    prev: InvoiceFormState,
    formData: FormData,
  ) => Promise<InvoiceFormState>;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [products, setProducts] = useState(initialProducts);
  const [customerId, setCustomerId] = useState(invoice?.customerId ?? "");
  const [lines, setLines] = useState<InvoiceLineInput[]>(
    invoice?.lines?.length ? linesFromInvoice(invoice.lines) : [emptyLine()],
  );
  const [selectedProductId, setSelectedProductId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoiceDate
      ? new Date(invoice.invoiceDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "",
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");

  const [saveState, saveFormAction, savePending] = useActionState(saveAction, {});
  const [issueState, issueFormAction, issuePending] = useActionState(issueAction, {});

  const errorMessage = saveState.error ?? issueState.error;

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.rate, 0),
    [lines],
  );

  const linesJson = JSON.stringify(lines);

  function updateLine(index: number, patch: Partial<InvoiceLineInput>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function addProductLine(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setLines((prev) => [
      ...prev,
      {
        lineType: "product",
        productId: product.id,
        description: product.name,
        quantity: 1,
        rate: centsToRupees(product.sellingRateCents),
        customChargeLabel: "",
      },
    ]);
    setSelectedProductId("");
  }

  function addChargeLine(type: "transport" | "loading_unloading" | "custom") {
    const labels = {
      transport: "Transport",
      loading_unloading: "Loading / Unloading",
      custom: "Custom charge",
    };
    setLines((prev) => [
      ...prev,
      {
        lineType: type,
        productId: "",
        description: labels[type],
        quantity: 1,
        rate: 0,
        customChargeLabel: type === "custom" ? "Custom charge" : "",
      },
    ]);
  }

  return (
    <div className="pb-24">
      {errorMessage && (
        <div className="mb-4">
          <ErrorAlert message={errorMessage} />
        </div>
      )}

      <div className="space-y-6">
        <section className="grid gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customerId">Client</Label>
            <div className="flex gap-2">
              <Select
                id="customerId"
                name="customerId"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="flex-1"
              >
                <option value="">Select client…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </option>
                ))}
              </Select>
              <QuickClientSheet
                onCreated={(c) => {
                  setCustomers((prev) =>
                    [...prev, c].sort((a, b) => a.name.localeCompare(b.name)),
                  );
                  setCustomerId(c.id);
                }}
                orgSlug={orgSlug}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="productPicker">Add product</Label>
              <Select
                id="productPicker"
                value={selectedProductId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedProductId(id);
                  if (id) addProductLine(id);
                }}
              >
                <option value="">Search products…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({String(p.lengthMm)}×{String(p.widthMm)}×{String(p.heightMm)})
                  </option>
                ))}
              </Select>
            </div>
            <QuickProductSheet
              orgSlug={orgSlug}
              onCreated={(p) => {
                setProducts((prev) =>
                  [...prev, p].sort((a, b) => a.name.localeCompare(b.name)),
                );
                setLines((prev) => [
                  ...prev,
                  {
                    lineType: "product",
                    productId: p.id,
                    description: p.name,
                    quantity: 1,
                    rate: centsToRupees(p.sellingRateCents),
                    customChargeLabel: "",
                  },
                ]);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addChargeLine("transport")}>
              + Transport
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addChargeLine("loading_unloading")}>
              + Loading
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addChargeLine("custom")}>
              + Custom
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500">Line items</h2>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={index}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-zinc-500">
                    {line.lineType.replace("_", " ")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, { quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Rate (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.rate}
                      onChange={(e) =>
                        updateLine(index, { rate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <p className="mt-2 text-right text-sm font-medium">
                  {formatINR(BigInt(Math.round(line.quantity * line.rate * 100)))}
                </p>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
            <Plus className="mr-1 h-4 w-4" /> Add row
          </Button>
        </section>

        <section className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, delivery notes…"
          />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500">Grand total</p>
            <p className="text-xl font-semibold">
              {formatINR(BigInt(Math.round(subtotal * 100)))}
            </p>
          </div>
          <div className="flex gap-2">
            <form action={saveFormAction}>
              <input type="hidden" name="customerId" value={customerId} />
              <input type="hidden" name="invoiceDate" value={invoiceDate} />
              <input type="hidden" name="dueDate" value={dueDate} />
              <input type="hidden" name="notes" value={notes} />
              <input type="hidden" name="linesJson" value={linesJson} />
              <Button type="submit" variant="outline" disabled={savePending || issuePending}>
                {savePending ? "Saving…" : "Save draft"}
              </Button>
            </form>
            <form action={issueFormAction}>
              <input type="hidden" name="customerId" value={customerId} />
              <input type="hidden" name="invoiceDate" value={invoiceDate} />
              <input type="hidden" name="dueDate" value={dueDate} />
              <input type="hidden" name="notes" value={notes} />
              <input type="hidden" name="linesJson" value={linesJson} />
              <Button type="submit" disabled={savePending || issuePending || !customerId}>
                {issuePending ? "Issuing…" : "Issue"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickClientSheet({
  orgSlug,
  onCreated,
}: {
  orgSlug: string;
  onCreated: (c: CustomerOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    const result = await quickCreateClient(orgSlug, name, phone);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onCreated({ id: result.data!.id, name: result.data!.name, phone: phone || null });
    setOpen(false);
    setName("");
    setPhone("");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          + Client
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md p-6">
        <h3 className="text-lg font-semibold">Quick add client</h3>
        <div className="mt-4 space-y-3">
          {error && <ErrorAlert message={error} />}
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Create & select"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QuickProductSheet({
  orgSlug,
  onCreated,
}: {
  orgSlug: string;
  onCreated: (p: ProductOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lengthMm, setLengthMm] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [sellingRate, setSellingRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    const result = await quickCreateProduct(orgSlug, {
      name,
      lengthMm: parseFloat(lengthMm),
      widthMm: parseFloat(widthMm),
      heightMm: parseFloat(heightMm),
      purchaseRate: parseFloat(purchaseRate) || 0,
      sellingRate: parseFloat(sellingRate) || 0,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onCreated({
      id: result.data!.id,
      name: result.data!.name,
      lengthMm: { toString: () => lengthMm },
      widthMm: { toString: () => widthMm },
      heightMm: { toString: () => heightMm },
      ply: null,
      sellingRateCents: result.data!.sellingRateCents,
      purchaseRateCents: BigInt(Math.round((parseFloat(purchaseRate) || 0) * 100)),
    });
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          + Product
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-6">
        <h3 className="text-lg font-semibold">Quick add product</h3>
        <div className="mt-4 space-y-3">
          {error && <ErrorAlert message={error} />}
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>L (mm)</Label>
              <Input value={lengthMm} onChange={(e) => setLengthMm(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>W (mm)</Label>
              <Input value={widthMm} onChange={(e) => setWidthMm(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>H (mm)</Label>
              <Input value={heightMm} onChange={(e) => setHeightMm(e.target.value)} type="number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Purchase (₹)</Label>
              <Input value={purchaseRate} onChange={(e) => setPurchaseRate(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>Selling (₹)</Label>
              <Input value={sellingRate} onChange={(e) => setSellingRate(e.target.value)} type="number" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Create & add line"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
