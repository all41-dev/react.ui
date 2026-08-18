import { ChevronLeft, ChevronRight } from "lucide-react";

import { pageWindow } from "./pageWindow";

type Props = {
  current: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  canPrev: boolean;
  canNext: boolean;
  onPageChange: (pageIndex: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (pageSize: number) => void;
  hidden?: boolean;
};

export function PagerControls({
  current,
  pageCount,
  pageSize,
  pageSizeOptions,
  canPrev,
  canNext,
  onPageChange,
  onPrev,
  onNext,
  onPageSizeChange,
  hidden = false,
}: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${hidden ? "hidden" : ""}`}>
      <label className="flex items-center gap-1.5 text-[.75rem] text-muted">
        Rows
        {/* Inset surface, matching the search and filter controls. */}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-[26px] cursor-pointer rounded-control border border-border-default bg-surface-inset px-1.5 text-[.75rem] text-body outline-none focus:border-accent focus:ring-2 focus:ring-[var(--rui-focus-ring)]"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-0.5">
        <PagerButton label="Previous page" onClick={onPrev} disabled={!canPrev}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </PagerButton>

        {pageCount > 0 &&
          pageWindow(current, pageCount).map((p) =>
            typeof p === "number" ? (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p - 1)}
                aria-label={`Page ${p}`}
                aria-current={p === current ? "page" : undefined}
                /* Every page carries a border, so the strip reads as a set of
                   controls rather than loose numerals. */
                className={[
                  "h-[26px] min-w-[26px] cursor-pointer rounded-control border px-1.5 text-[.75rem] outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]",
                  p === current
                    ? "border-accent bg-accent font-bold text-accent-contrast"
                    : "border-border-default bg-transparent text-body hover:bg-surface-raised",
                ].join(" ")}
              >
                {p}
              </button>
            ) : (
              <span key={p} aria-hidden className="px-1 text-[.75rem] text-faint">
                …
              </span>
            )
          )}

        <PagerButton label="Next page" onClick={onNext} disabled={!canNext}>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-control border border-border-default text-body outline-none transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
