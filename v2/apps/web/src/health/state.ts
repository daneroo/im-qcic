import type { ConnectionState } from "../components/marks";
import type { HealthReading } from "./types";

export function deriveHealthReading<T>(options: {
  coarse: { available: boolean } | null;
  coarseCurrent: boolean;
  transportStatus: ConnectionState;
  value: T | null;
}): HealthReading<T> {
  const { coarse, coarseCurrent, transportStatus, value } = options;

  if (!coarse) {
    return {
      status:
        !value &&
        (transportStatus === "connecting" || transportStatus === "reconnecting")
          ? "loading"
          : "unavailable",
      value,
      transportStatus,
    };
  }

  if (!coarseCurrent || !coarse.available) {
    return { status: "unavailable", value, transportStatus };
  }

  if (transportStatus === "connected" && value) {
    return { status: "live", value, transportStatus };
  }

  return {
    status: value || transportStatus === "closed" ? "unavailable" : "loading",
    value,
    transportStatus,
  };
}
