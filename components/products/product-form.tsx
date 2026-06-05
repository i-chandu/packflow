"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/shared/error-alert";
import { centsToRupees } from "@/lib/money";
import type { ProductFormState } from "@/app/actions/products";
import type { Product, Supplier } from "@prisma/client";

type ProductFormProps = {
  orgSlug: string;
  suppliers: Pick<Supplier, "id" | "name">[];
  product?: Product;
  action: (
    prev: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
  submitLabel: string;
};

const initialState: ProductFormState = {};

export function ProductForm({
  orgSlug,
  suppliers,
  product,
  action,
  submitLabel,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error && <ErrorAlert message={state.error} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Box name *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={product?.name}
            placeholder="2 Pack Box"
          />
          {state.fieldErrors?.name && (
            <p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lengthMm">Length (mm) *</Label>
          <Input
            id="lengthMm"
            name="lengthMm"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product ? Number(product.lengthMm) : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="widthMm">Width (mm) *</Label>
          <Input
            id="widthMm"
            name="widthMm"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product ? Number(product.widthMm) : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heightMm">Height (mm) *</Label>
          <Input
            id="heightMm"
            name="heightMm"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product ? Number(product.heightMm) : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ply">Ply</Label>
          <Input id="ply" name="ply" defaultValue={product?.ply ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gsm">GSM</Label>
          <Input
            id="gsm"
            name="gsm"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.gsm ? Number(product.gsm) : ""}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="supplierId">Manufacturer</Label>
          <Select id="supplierId" name="supplierId" defaultValue={product?.supplierId ?? ""}>
            <option value="">— None —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchaseRate">Purchase rate (₹) *</Label>
          <Input
            id="purchaseRate"
            name="purchaseRate"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={
              product ? centsToRupees(product.purchaseRateCents) : undefined
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sellingRate">Selling rate (₹) *</Label>
          <Input
            id="sellingRate"
            name="sellingRate"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={
              product ? centsToRupees(product.sellingRateCents) : undefined
            }
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={product?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={product?.notes ?? ""} rows={3} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={product ? `/${orgSlug}/products/${product.id}` : `/${orgSlug}/products`}>
            Cancel
          </a>
        </Button>
      </div>
    </form>
  );
}
