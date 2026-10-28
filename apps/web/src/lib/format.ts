export function money(value: number | string | null | undefined) {
  if (value == null) return "—";
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function date(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function statusClass(value: string) {
  return ({ Open: "open", "In Progress": "progress", Resolved: "resolved", Closed: "closed" } as Record<string, string>)[value] ?? "open";
}

export function priorityClass(value: string) {
  return value.toLowerCase();
}
