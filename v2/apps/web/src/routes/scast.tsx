import { createFileRoute } from "@tanstack/react-router";
import { NATS_WS_URL } from "../config";
import { shorten } from "../scast/generation";
import { useScastFeed } from "../scast/useScastFeed";

export const Route = createFileRoute("/scast")({
  component: ScastPage,
});

function ScastPage() {
  const { status, table } = useScastFeed(NATS_WS_URL);
  const displayTable = shorten(table);
  const [header, ...rows] = displayTable;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">scast</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {status === "connected" ? "Live" : status}
      </p>

      {!header ? (
        <p className="mt-4 text-gray-500 dark:text-gray-400">
          Waiting for data...
        </p>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th
                  key={i}
                  className="border-b border-gray-300 p-2 text-left dark:border-gray-700"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="border-b border-gray-100 p-2 font-mono dark:border-gray-800"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
