/**
 * The grid reads column visibility from localStorage and nowhere else
 * (`hooks/useColumnPrefs.ts`) — there is no prop for a default layout, so seeding the
 * stored blob before the grid mounts is the only way to open on a subset of columns
 * without changing the grid.
 *
 * The seed is applied once per `layoutVersion`, tracked under its own marker key rather
 * than by "is the blob missing". Keying it off absence meant anyone who had already
 * opened the grid kept their all-columns-visible blob and never saw the default at all.
 * Bump `layoutVersion` to push a new layout to people who already have one.
 *
 * Two things this still cannot do:
 *  - Reset in the Columns popover restores ALL columns, not this subset — it clears the
 *    blob rather than replaying the seed.
 *  - `PREFS_VERSION` must track `VERSION` in useColumnPrefs. On a mismatch the grid
 *    discards the blob and opens with every column showing.
 */
const PREFS_VERSION = 1;

export function seedHiddenColumns(
  storageKey: string,
  hiddenColumnIds: string[],
  layoutVersion = 1
): void {
  if (typeof window === "undefined") return;
  const marker = `${storageKey}:seed`;
  try {
    if (localStorage.getItem(marker) === String(layoutVersion)) return;

    const existing = localStorage.getItem(storageKey);
    const parsed = existing ? JSON.parse(existing) : null;
    const base =
      parsed && parsed.v === PREFS_VERSION
        ? parsed
        : { columnSizing: {}, columnOrder: [], v: PREFS_VERSION };

    /* Sizing and order the user already chose are kept; only visibility is restated. */
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...base,
        columnVisibility: Object.fromEntries(
          hiddenColumnIds.map((id) => [id, false])
        ),
        v: PREFS_VERSION,
      })
    );
    localStorage.setItem(marker, String(layoutVersion));
  } catch {
    /* storage unavailable — the grid opens with every column, which is harmless */
  }
}
