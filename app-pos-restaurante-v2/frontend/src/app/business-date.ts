export function businessDate(value: Date | string = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  // API timestamps are serialized with a Bogotá offset; browser locale is irrelevant.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  return ["year", "month", "day"]
    .map((t) => parts.find((p) => p.type === t)?.value)
    .join("-");
}
