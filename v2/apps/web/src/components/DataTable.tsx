export function DataTable({ table }: { table: (string | number | null)[][] }) {
  const [header, ...rows] = table;

  if (!header) {
    return (
      <p className="mt-4 text-gray-500 dark:text-gray-400">
        Waiting for data...
      </p>
    );
  }

  return (
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
  );
}
