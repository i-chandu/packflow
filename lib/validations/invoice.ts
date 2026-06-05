import { z } from "zod";

export const invoiceLineSchema = z.object({
  lineType: z.enum(["product", "transport", "loading_unloading", "custom"]),
  productId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  rate: z.coerce.number().nonnegative("Rate must be ≥ 0"),
  customChargeLabel: z.string().max(200).optional().or(z.literal("")),
});

export const invoiceFormSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal("")),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  lines: z.array(invoiceLineSchema).min(1, "Add at least one line item"),
});

export const invoiceIssueSchema = invoiceFormSchema.extend({
  customerId: z.string().uuid("Client is required"),
});

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;

export function parseLinesJson(raw: string): InvoiceLineInput[] {
  const parsed = JSON.parse(raw) as unknown;
  const result = z.array(invoiceLineSchema).safeParse(parsed);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

export function formDataToInvoiceInput(
  formData: FormData,
  requireCustomer = false,
): InvoiceFormInput {
  const linesRaw = formData.get("linesJson");
  if (typeof linesRaw !== "string" || !linesRaw) {
    throw new Error("Missing line items");
  }

  const schema = requireCustomer ? invoiceIssueSchema : invoiceFormSchema;
  const result = schema.safeParse({
    customerId: formData.get("customerId") || "",
    invoiceDate: formData.get("invoiceDate"),
    dueDate: formData.get("dueDate") || "",
    notes: formData.get("notes") || "",
    lines: parseLinesJson(linesRaw),
  });

  if (!result.success) {
    throw result.error;
  }
  return result.data;
}
