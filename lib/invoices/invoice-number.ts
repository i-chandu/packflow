import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export function formatInvoiceNumber(
  prefix: string,
  seq: number,
  padWidth: number,
): string {
  return `${prefix}-${String(seq).padStart(padWidth, "0")}`;
}

/** Atomically allocates the next invoice number from the org sequence. */
export async function allocateInvoiceNumber(
  tx: Tx,
  organizationId: string,
): Promise<string> {
  const org = await tx.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { invoicePrefix: true, invoicePadWidth: true, invoiceNextSeq: true },
  });

  const seq = org.invoiceNextSeq;
  const invoiceNumber = formatInvoiceNumber(
    org.invoicePrefix,
    seq,
    org.invoicePadWidth,
  );

  await tx.organization.update({
    where: { id: organizationId },
    data: { invoiceNextSeq: seq + 1 },
  });

  return invoiceNumber;
}
