import type { ReactNode } from "react";

export function Stratum({
  index,
  name,
  role,
  tone,
  health = "live",
  children,
}: {
  index: number;
  name: string;
  role: string;
  tone: "paper" | "sunken" | "deep";
  health?: "live" | "unverifiable";
  children: ReactNode;
}) {
  const background = {
    paper: "bg-paper",
    sunken: "bg-sunken",
    deep: "bg-deep",
  }[tone];

  return (
    <section className={`${background} border-t border-rule`}>
      <div className="mx-auto flex max-w-5xl gap-5 px-4 py-8 sm:gap-8 sm:px-8">
        <div className="flex w-7 shrink-0 flex-col items-center gap-2 sm:w-9">
          <span className="qc-num text-[11px] font-medium text-ink-2">
            {String(index).padStart(2, "0")}
          </span>
          <h2
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-2"
            style={{ writingMode: "vertical-rl" }}
          >
            {name}
          </h2>
          <span className="w-px flex-1 bg-rule-strong" />
        </div>
        <div
          className={`min-w-0 flex-1 ${health === "unverifiable" ? "opacity-50" : ""}`}
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] text-ink-3">{role}</p>
            {health === "unverifiable" && (
              <span className="rounded-full border border-dashed border-partial px-2 py-0.5 text-[10px] tracking-wide text-ink-2">
                unverifiable
              </span>
            )}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
