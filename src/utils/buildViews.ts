import React,{type JSX} from "react";

const toPascal = (k: string) =>
  k.split(/[-_]/g).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");

const candidatesFor = (key: string) => {
  const pascal = toPascal(key);
  const kebab  = key;
  const camel  = key.replace(/-([a-z])/g, (_,c)=>c.toUpperCase());
  return new Set([`${pascal}.tsx`, `${kebab}.tsx`, `${camel}.tsx`]);
};

type LazyComp = React.LazyExoticComponent<() => JSX.Element>;

/**
 * Build a Record<key, LazyComp> by matching keys to files in a folder.
 * Example folder: "../pages/partners/*.tsx"
 */
export function buildViews<
  K extends string
>(
  keys: readonly K[],
  modules: Record<string, () => Promise<any>>
): Record<K, LazyComp> {
  const byBase = new Map<string, () => Promise<any>>();
  Object.entries(modules).forEach(([path, loader]) => {
    const base = path.split("/").pop()!;
    byBase.set(base, loader);
  });

  const views = {} as Record<K, LazyComp>;

  for (const key of keys) {
    const variants = candidatesFor(String(key));
    let loader: (() => Promise<any>) | undefined;

    for (const v of variants) {
      if (byBase.has(v)) {
        loader = byBase.get(v);
        break;
      }
    }

    if (!loader) {
      const exp = Array.from(variants).join(" | ");
      throw new Error(
        `[buildViews] No file for key "${key}". Expected one of: ${exp}`
      );
    }

    views[key] = React.lazy(loader);
  }

  return views;
}
