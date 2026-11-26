/*
 * A split's remembered shares, kept in localStorage the way a grid keeps its
 * layout. Best-effort: a blocked storage reads as the fallback and takes no
 * write.
 */

const PREFS_VERSION = 1;

const isShare = (value: unknown): value is number =>
  typeof value === "number" && value >= 0 && value <= 1;

function readStored(storageKey: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return (parsed as { v?: unknown }).v === PREFS_VERSION ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function writeStored(storageKey: string, value: Record<string, unknown> | null) {
  try {
    if (value === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify({ v: PREFS_VERSION, ...value }));
  } catch {
    // Nothing to do: the shares last the session.
  }
}

/** The panes' shares in order, `{ v, sizes }`. A list of another length reads as the fallback. */
export function readSplitSizes(storageKey: string | undefined, fallback: readonly number[]): number[] {
  if (!storageKey) return [...fallback];
  const sizes = readStored(storageKey)?.sizes;
  const valid =
    Array.isArray(sizes) &&
    sizes.length === fallback.length &&
    sizes.every(isShare) &&
    sizes.some((size) => size > 0);
  return valid ? [...(sizes as number[])] : [...fallback];
}

/** `null` forgets the shares. */
export function writeSplitSizes(storageKey: string | undefined, sizes: readonly number[] | null) {
  if (!storageKey) return;
  writeStored(storageKey, sizes === null ? null : { sizes });
}

/**
 * Named shares under one key, `{ v, ratios }`. A missing or malformed share
 * reads as its default; `null` forgets one share and keeps the others.
 */
export function readSplitRatios<K extends string>(
  storageKey: string,
  defaults: Record<K, number>,
): Record<K, number> {
  const out = { ...defaults };
  const ratios = readStored(storageKey)?.ratios;
  if (typeof ratios !== "object" || ratios === null) return out;
  for (const name of Object.keys(defaults) as K[]) {
    const ratio = (ratios as Record<string, unknown>)[name];
    if (isShare(ratio)) out[name] = ratio;
  }
  return out;
}

export function writeSplitRatios<K extends string>(
  storageKey: string,
  ratios: Partial<Record<K, number | null>>,
) {
  const kept: Record<string, number> = {};
  for (const [name, ratio] of Object.entries(ratios)) {
    if (typeof ratio === "number") kept[name] = ratio;
  }
  writeStored(storageKey, Object.keys(kept).length === 0 ? null : { ratios: kept });
}
