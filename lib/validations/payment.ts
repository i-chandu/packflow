import { z } from "zod";

const paymentMethodEnum = z.enum([
  "bank_transfer",
  "cheque",
  "cash",
  "upi",
  "card",
  "other",
]);

export const inboundPaymentSchema = z.object({
  customerId: z.string().uuid("Client is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  method: paymentMethodEnum.default("bank_transfer"),
  reference: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  invoiceId: z.string().uuid().optional().or(z.literal("")),
});

export const outboundPaymentSchema = z.object({
  supplierId: z.string().uuid("Supplier is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  method: paymentMethodEnum.default("bank_transfer"),
  reference: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  supplierBillId: z.string().uuid().optional().or(z.literal("")),
});

export type InboundPaymentInput = z.infer<typeof inboundPaymentSchema>;
export type OutboundPaymentInput = z.infer<typeof outboundPaymentSchema>;

export function formDataToInboundPayment(formData: FormData): InboundPaymentInput {
  return inboundPaymentSchema.parse({
    customerId: formData.get("customerId"),
    paymentDate: formData.get("paymentDate"),
    amount: formData.get("amount"),
    method: formData.get("method") || "bank_transfer",
    reference: formData.get("reference") || "",
    notes: formData.get("notes") || "",
    invoiceId: formData.get("invoiceId") || "",
  });
}

export function formDataToOutboundPayment(formData: FormData): OutboundPaymentInput {
  return outboundPaymentSchema.parse({
    supplierId: formData.get("supplierId"),
    paymentDate: formData.get("paymentDate"),
    amount: formData.get("amount"),
    method: formData.get("method") || "bank_transfer",
    reference: formData.get("reference") || "",
    notes: formData.get("notes") || "",
    supplierBillId: formData.get("supplierBillId") || "",
  });
}
