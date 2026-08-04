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
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">scast</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {status === "connected" ? "Live" : status}
      </p>
      <DataTable table={shorten(table)} />
    </main>
  );
}
