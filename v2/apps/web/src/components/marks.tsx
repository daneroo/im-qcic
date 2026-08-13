import type { ReactNode } from "react";

export function Byline({ children }: { children: ReactNode }) {
  return (
    <div className="mt-auto flex items-center gap-3 pt-6">
      <div className="h-px flex-1 bg-rule" />
      <p className="qc-digest text-[10px] lowercase tracking-wide text-ink-3">
        {children}
      </p>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[11px] text-ink-3">{children}</div>;
}

export type ConnectionState =
  "connected" | "connecting" | "reconnecting" | "closed";

export function ConnectionDot({ status }: { status: ConnectionState }) {
  if (status === "connected") {
    return (
      <span className="relative inline-flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-partial" />
    );
  }
  return (
    <span className="inline-block h-2 w-2 shrink-0 rounded-full border-2 border-partial" />
  );
}

export function ConnectionLabel({ status }: { status: ConnectionState }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-2">
      <ConnectionDot status={status} />
      {status === "connected" ? "live" : status}
    </span>
  );
}
