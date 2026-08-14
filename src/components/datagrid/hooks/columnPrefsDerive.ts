import type { ColumnPrefs } from "./columnPrefsStorage";

/**
 * The pure half of `useColumnPrefs`: what the stored preferences mean once the current
 * column list is taken into account.
 */

/* The order the table actually renders: stored ids that still exist, then every id the
   store has never seen, in declaration order. */
export function normalizeOrder(
  order: string[],
  allColumnIds: string[]
): string[] {
  const known = new Set(allColumnIds);
  const kept = order.filter((id) => known.has(id));
  const missing = allColumnIds.filter((id) => !kept.includes(id));
  return [...kept, ...missing];
}

/**
 * Three layers, innermost first: the columns that ship hidden (`meta.visibleInTable`),
 * then what the user chose, then what the current viewport forces hidden
 * (`meta.hideOnMobile`). The user beats the shipped seed; the viewport beats both.
 * Neither outer layer is ever written to storage.
 */
export function mergeVisibility(
  stored: Record<string, boolean>,
  defaultHiddenIds: string[],
  forceHiddenIds: string[]
): Record<string, boolean> {
  if (defaultHiddenIds.length === 0 && forceHiddenIds.length === 0) return stored;
  const seeded: Record<string, boolean> = {};
  for (const id of defaultHiddenIds) seeded[id] = false;
  const forced: Record<string, boolean> = {};
  for (const id of forceHiddenIds) forced[id] = false;
  return { ...seeded, ...stored, ...forced };
}

/**
 * Whether the grid is still in its shipped layout, for "Reset view".
 *
 * Read off the stored preferences, not the state handed to the table: the default-hidden
 * seed is the shipped layout, so a grid carrying one is untouched.
 */
export function prefsAreDefault(
  prefs: ColumnPrefs,
  allColumnIds: string[]
): boolean {
  const orderIsDefault =
    prefs.columnOrder.length === 0 ||
    (prefs.columnOrder.length === allColumnIds.length &&
      prefs.columnOrder.every((id, i) => id === allColumnIds[i]));
  return (
    Object.keys(prefs.columnSizing).length === 0 &&
    Object.keys(prefs.columnVisibility).length === 0 &&
    orderIsDefault
  );
}
