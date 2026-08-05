# Sandbox theme overrides

The library ships a **neutral** palette. Nothing in this repository carries brand colours,
because this repository is public.

To preview the sandbox in a brand palette, drop a file here named `*.local.css`:

```
src/app/styles/acme.local.css
```

`src/main.tsx` picks up every `*.local.css` in this folder via `import.meta.glob` and
applies it after the library defaults, so it wins. Zero matching files is a no-op — the
sandbox simply renders neutral. That is why a glob is used instead of a plain `import`:
a static import of a gitignored file would break `npm run dev` for anyone who clones.

`*.local.css` is gitignored. **Share brand files with colleagues directly, never through
git.**

Start from `theme.local.css.example` — copy it, rename it to `<brand>.local.css`, and fill
in real values.

## What to override

Colour only, in almost all cases. Fonts and radii are tokens too, but sizing, spacing and
motion are deliberately not — they are the component's design rather than your brand.

You do not need to set every token. Anything you leave out keeps the library default, so
an override file is usually just the accent and surface families.

The full token list is in the root `README.md` under "Theming".
