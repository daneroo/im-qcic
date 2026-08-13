import { createFileRoute } from "@tanstack/react-router";
import { DataTable } from "../components/DataTable";
import { NATS_WS_URL } from "../config";
import { shorten } from "../scast/generation";
import { useScastFeed } from "../scast/useScastFeed";

export const Route = createFileRoute("/scast")({
  component: ScastPage,
});

function ScastPage() {
  const { status, table } = useScastFeed(NATS_WS_URL);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold text-ink">scast</h1>
      <p className="mt-1 text-sm text-ink-2">
        {status === "connected" ? "Live" : status}
      </p>
      <DataTable table={shorten(table)} />
    </main>
  );
}
