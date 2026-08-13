import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "../components/DataTable";
import { NATS_WS_URL } from "../config";
import { KV_BUCKET_NAME, VIEW_NAMES, type ViewName } from "../tedcheck/config";
import type { TedcheckViewPayload } from "../tedcheck/types";
import { useDerivedState } from "../tedcheck/useDerivedState";

export const Route = createFileRoute("/tedcheck")({
  component: TedcheckPage,
});

function TedcheckPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold text-ink">tedcheck</h1>
      {VIEW_NAMES.map((view) => (
        <TedcheckView key={view} view={view} />
      ))}
    </main>
  );
}

function TedcheckView({ view }: { view: ViewName }) {
  const { status, value } = useDerivedState<TedcheckViewPayload>(
    NATS_WS_URL,
    KV_BUCKET_NAME,
    view,
  );

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium text-ink">{view}</h2>
        <p className="text-sm text-ink-2">
          {status === "connected" ? "Live" : status}
          {value ? ` · updated ${value.meta.stamp}` : ""}
        </p>
      </div>
      <DataTable table={value?.data ?? []} />
    </section>
  );
}
