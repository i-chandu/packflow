export function rupeesToCents(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function centsToRupees(cents: bigint | number): number {
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  return n / 100;
}

export function formatINR(cents: bigint | number): string {
  const amount = centsToRupees(cents);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function parseRupeeInput(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}
