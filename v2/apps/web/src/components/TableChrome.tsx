import type { ReactNode } from "react";

export function TableChrome({
  minWidth,
  header,
  children,
  fixed = false,
}: {
  minWidth: string;
  header: ReactNode;
  children: ReactNode;
  fixed?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full border-collapse text-sm ${fixed ? "table-fixed" : ""}`}
        style={{ minWidth }}
      >
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
            {header}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
