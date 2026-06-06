import { z } from "zod";

export const supplierBillFormSchema = z.object({
  supplierId: z.string().uuid("Supplier is required"),
  billNumber: z.string().min(1, "Bill number is required").max(100),
  reference: z.string().max(100).optional().or(z.literal("")),
  billDate: z.string().min(1, "Bill date is required"),
  dueDate: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type SupplierBillFormInput = z.infer<typeof supplierBillFormSchema>;

export function formDataToSupplierBillInput(formData: FormData): SupplierBillFormInput {
  return supplierBillFormSchema.parse({
    supplierId: formData.get("supplierId"),
    billNumber: formData.get("billNumber"),
    reference: formData.get("reference") || "",
    billDate: formData.get("billDate"),
    dueDate: formData.get("dueDate") || "",
    amount: formData.get("amount"),
    notes: formData.get("notes") || "",
  });
}
