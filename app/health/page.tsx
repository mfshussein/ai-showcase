import { redirect } from "next/navigation";
import { requirePresenter } from "@/lib/session";
import { Brand } from "@/components/brand";
import { HealthClient } from "./health-client";

export default async function HealthPage() {
  if (!(await requirePresenter())) redirect("/");
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <Brand />
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Preflight</h1>
      <p className="mt-2 text-muted">Run this before a meeting. Replay needs none of it; live mode needs all of it.</p>
      <div className="mt-8"><HealthClient /></div>
    </main>
  );
}
