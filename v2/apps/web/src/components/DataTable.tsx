// Deleted by #265/#266, whose pages replace its only two call sites. Kept on
// tokens meanwhile so the six palettes are honest everywhere.
//
// Cells stay monospaced, which theme.css's type rule reserves for digests.
// The untyped matrix is why: this component cannot tell a digest column from a
// date one, so it cannot apply the rule. That is the same untypedness the
// spec gives as the reason to delete it rather than redesign it, and the two
// pages that replace it will know what each column means.
export function DataTable({ table }: { table: (string | number | null)[][] }) {
  const [header, ...rows] = table;

  if (!header) {
    return <p className="mt-4 text-ink-3">Waiting for data...</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="border-b border-rule-strong p-2 text-left font-medium text-ink-2"
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
                  className="qc-digest border-b border-rule p-2 text-ink"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
