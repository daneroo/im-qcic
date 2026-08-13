export function localHM(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function utcISO(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

export function tzLabel(): string {
  try {
    const name = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    if (name) return name;
  } catch {
    // Fall through to an unambiguous numeric offset.
  }
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}
