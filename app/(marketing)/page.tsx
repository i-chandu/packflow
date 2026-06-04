import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Invoicing built for packaging box brokers
        </h1>
        <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
          Issue invoices in under 30 seconds, track margins per box, manage
          client outstanding, and print Indian-format PDFs — from desktop or
          mobile.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/signup">Start free trial</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="mt-24 grid gap-6 sm:grid-cols-3">
        {[
          {
            title: "Fast invoice builder",
            body: "Add boxes from catalog or create new sizes inline. Transport, loading, and carry-forward balance included.",
          },
          {
            title: "Profit per invoice",
            body: "(Selling − purchase) × quantity on every line. Reports by client, product, and month.",
          },
          {
            title: "Outstanding control",
            body: "Client ledger, partial payments, top debtors on dashboard, supplier payable tracking.",
          },
        ].map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <CardTitle className="text-base">{f.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
