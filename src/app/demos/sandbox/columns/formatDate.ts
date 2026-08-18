/** Dates arrive as ISO strings; anything unparseable is shown as it came. */
export function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}
