import type { ReactNode } from "react";
import { formatMissing } from "../format/duration";
import { utcISO } from "../format/time";
import type { Ted1kBucket } from "./derive";

export function Reading({
  value,
  unit,
  label,
}: {
  value: ReactNode;
  unit: string;
  label: string;
}) {
  return (
    <div className="w-full">
      <div className="mb-1 text-[11px] text-ink-3">{label}</div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="qc-num text-5xl leading-none font-light tracking-tight text-ink">
          {value}
        </span>
        <span className="text-sm font-medium text-ink-3">{unit}</span>
      </div>
    </div>
  );
}

export function CoverageStrip({
  buckets,
  height = 48,
}: {
  buckets: Ted1kBucket[];
  height?: number;
}) {
  const worst = Math.max(
    1,
    ...buckets.map((bucket) => (bucket.partial ? 0 : bucket.missing)),
  );
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[10px] text-ink-3">
        <span>missing</span>
        <span className="qc-num">peak {formatMissing(worst)}</span>
      </div>
      <div
        className="flex w-full items-end gap-[2px] border-b border-rule"
        style={{ height }}
        role="img"
        aria-label={`Missing time by bucket; peak ${formatMissing(worst)}`}
      >
        {buckets.map((bucket) => {
          const title = utcISO(bucket.start);
          if (bucket.partial) {
            return (
              <span
                key={title}
                title={`${title} — partial window, not comparable`}
                className="min-w-0 flex-1 rounded-[2px] border border-dashed border-partial"
                style={{ height: "100%" }}
              />
            );
          }
          const heightShare =
            bucket.missing === 0
              ? 0.14
              : Math.max(0.18, Math.sqrt(bucket.missing / worst));
          return (
            <span
              key={title}
              title={`${title} — ${formatMissing(bucket.missing)} missing`}
              className={`min-w-0 flex-1 rounded-[2px] ${
                bucket.significant
                  ? "bg-alarm"
                  : bucket.missing === 0
                    ? "bg-absent/70"
                    : "bg-ink-3/45"
              }`}
              style={{ height: `${heightShare * 100}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ConsumptionStrip({
  buckets,
  height = 48,
}: {
  buckets: Ted1kBucket[];
  height?: number;
}) {
  const values = buckets.flatMap((bucket) =>
    bucket.watt === null ? [] : [bucket.watt],
  );
  if (values.length === 0) return null;
  const peak = Math.max(...values);
  const top = peak * 1.08 || 1;
  const kilowatts = (watt: number) => `${(watt / 1_000).toFixed(2)} kW`;

  return (
    <div className="w-full text-accent">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[10px] text-ink-3">
        <span>consumption, same window</span>
        <span className="qc-num">peak {kilowatts(peak)}</span>
      </div>
      <div
        className="flex w-full items-end gap-[2px] border-b border-rule-strong"
        style={{ height }}
        role="img"
        aria-label={`Consumption by bucket, from zero to ${kilowatts(peak)}`}
      >
        {buckets.map((bucket) => {
          const title = utcISO(bucket.start);
          if (bucket.watt === null)
            return <span key={title} className="min-w-0 flex-1" />;
          return (
            <span
              key={title}
              title={`${title} — ${kilowatts(bucket.watt)}${bucket.partial ? ", partial bucket" : ""}`}
              className={`min-w-0 flex-1 rounded-t-[2px] ${
                bucket.partial
                  ? "border border-b-0 border-dashed border-partial"
                  : "bg-current opacity-45"
              }`}
              style={{ height: `${Math.max(0.02, bucket.watt / top) * 100}%` }}
            />
          );
        })}
      </div>
      <div className="qc-num mt-1 text-[10px] text-ink-3">0 kW</div>
    </div>
  );
}
