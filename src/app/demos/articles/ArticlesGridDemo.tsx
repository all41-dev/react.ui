import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { AlertTriangle, CalendarClock, History, RefreshCw } from "lucide-react";
import { DataGrid } from "../../../components/datagrid/DataGrid";
import type { SelectOption } from "../../../components/datagrid/types/column";
import { toast } from "../../../utils/toast";
import { ApiError } from "../../../api/errors";
import {
  currentPriceRow,
  dayValue,
  isExpired,
  isoDay,
  mockArticlesApi,
  toRow,
  TAX_KINDS,
  type Article,
  type ArticlePriceHistory,
  type ArticleRow,
  type TaxKind,
} from "./articleData";
import { articleSchema, type ArticleForm } from "./articleSchema";
import {
  ARTICLE_KIND_OPTIONS,
  formatPrice,
  makeArticleColumns,
} from "./articleColumns";
import { seedHiddenColumns } from "./columnPrefs";

const STORAGE_KEY = "dg:articles";

/*
 * Kind declares its buckets, which fixes their order and colours and keeps an empty
 * bucket visible. Unit has an open-ended set, so its buckets are derived from the data.
 */
const GROUP_OPTIONS = [
  {
    key: "articleKind",
    label: "Kind",
    values: [
      { value: "time-based", label: "Time based", color: "#8b5cf6" },
      { value: "fixed-price", label: "Fixed price", color: "#0ea5e9" },
      { value: "recurrent", label: "Recurrent", color: "#16a34a" },
      { value: "package", label: "Package", color: "#d97706" },
    ],
  },
  { key: "unitSingular", label: "Unit" },
];

const kindLabel = (value: string) =>
  ARTICLE_KIND_OPTIONS.find((o) => o.value === value)?.label ?? value;

const FIELD_LABELS = (key: string) =>
  ({
    code: "code",
    shortDesignation: "designation",
    longDesignation: "long designation",
    unitSingular: "unit",
    taxKindUuid: "tax kind",
    isTaxIncluded: "tax included",
    articleKind: "kind",
    recurencyPeriod: "recurrency",
    accountNumber: "account number",
  })[key] ?? key;

/* Opens on code / designation / long designation / kind / current price. The rest stay
   one click away in the Columns popover. */
seedHiddenColumns(STORAGE_KEY, [
  "recurencyPeriod",
  "unitSingular",
  "taxKindUuid",
  "isTaxIncluded",
  "accountNumber",
]);

/* ------------------------------------------------------------------ */
/* Price history panel                                                 */
/* ------------------------------------------------------------------ */

const formatDay = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

function PriceHistoryPanel({ article }: { article: ArticleRow }) {
  const live = currentPriceRow(article.prices);

  /* Chronological by expiry, with the never-expiring row last — it is the one that
     takes over once everything dated ahead of it has lapsed. */
  const ordered = [...article.prices].sort((a, b) => {
    const at = a.dateTo ? new Date(a.dateTo).getTime() : Infinity;
    const bt = b.dateTo ? new Date(b.dateTo).getTime() : Infinity;
    return at - bt;
  });

  return (
    <div className="rounded-surface border border-border-default bg-surface-inset p-4">
      <h3 className="mb-3 text-[.8125rem] font-semibold text-body">
        Price history — {article.code}
      </h3>

      {ordered.length === 0 ? (
        <p className="text-[.8125rem] text-muted">
          No price has ever been recorded for this article.
        </p>
      ) : (
        <table className="w-full text-[.8125rem]">
          <thead>
            <tr className="border-b border-border-default text-left text-[.6875rem] uppercase tracking-[.06em] text-faint">
              <th className="pb-2 font-medium">Unit price</th>
              <th className="pb-2 font-medium">Valid until</th>
              <th className="pb-2 font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((p: ArticlePriceHistory) => {
              const isLive = live?.uuid === p.uuid;
              const expired = isExpired(p);
              return (
                <tr key={p.uuid} className="border-b border-border-translucent last:border-0">
                  <td className="py-2 font-mono text-[.75rem] text-body">
                    {formatPrice(p.unitPrice)}
                  </td>
                  <td className="py-2 text-muted">
                    {formatDay(p.dateTo) ?? "No expiry"}
                  </td>
                  <td className="py-2">
                    {isLive ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[.6875rem] font-medium text-success">
                        Current
                      </span>
                    ) : expired ? (
                      <span className="text-[.6875rem] text-faint">Expired</span>
                    ) : (
                      <span className="text-[.6875rem] text-muted">Scheduled</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * Sits in the actions pill beside Edit and Delete. The pill supplies the surface and
 * border, so these classes mirror the grid's own action buttons — 26px, transparent
 * until hover — and only the open state paints itself in.
 */
function HistoryButton({
  row,
  open,
  onToggle,
}: {
  row: ArticleRow;
  open: boolean;
  onToggle: (uuid: string) => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={
        open
          ? `Hide price history for ${row.code}`
          : `Show price history for ${row.code}`
      }
      title="Price history"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(row.uuid);
      }}
      className={
        "inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-control " +
        "border bg-transparent transition-colors outline-none " +
        "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] " +
        (open
          ? "border-border-default bg-surface-raised text-accent"
          : "border-transparent text-faint group-hover:text-muted hover:!border-border-default hover:!bg-surface-raised hover:!text-body")
      }
    >
      <History className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** Opens the price-change dialog for a row. */
function PlanPriceButton({
  row,
  onPlan,
}: {
  row: ArticleRow;
  onPlan: (row: ArticleRow) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Plan a price change for ${row.code}`}
      title="Plan a price change"
      onClick={(e) => {
        e.stopPropagation();
        onPlan(row);
      }}
      className={
        "inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-control " +
        "border border-transparent bg-transparent text-faint transition-colors outline-none " +
        "group-hover:text-muted hover:!border-border-default hover:!bg-surface-raised hover:!text-body " +
        "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
      }
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/**
 * Two fields, so it cannot be a cell popover: an amount plus the day it takes effect.
 * Dating it ahead schedules the change instead of applying it now.
 */
function PriceChangeDialog({
  article,
  onCancel,
  onSubmit,
}: {
  article: ArticleRow;
  onCancel: () => void;
  onSubmit: (unitPrice: number, effectiveFrom: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(isoDay(0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduled = dayValue(effectiveFrom) > dayValue(isoDay(0));

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError("Enter a price greater than 0");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(parsed, effectiveFrom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Plan a price change for ${article.code}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !saving) onCancel();
      }}
    >
      <form
        onSubmit={submit}
        className="flex w-full max-w-md flex-col gap-4 rounded-surface border border-border-default bg-surface-card p-5 shadow-[var(--elev-3)]"
      >
        <div>
          <h3 className="text-[.9375rem] font-semibold text-body">
            Price change — {article.code}
          </h3>
          <p className="mt-1 text-[.8125rem] text-muted">
            Current price {formatPrice(article.currentPrice)}. The outgoing price is
            closed on the date below and kept in the history.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[.8125rem] text-body">New unit price</span>
          <input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-control border border-border-default bg-surface-page px-2.5 py-1.5 text-[.8125rem] text-body outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[.8125rem] text-body">Effective from</span>
          <input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="rounded-control border border-border-default bg-surface-page px-2.5 py-1.5 text-[.8125rem] text-body outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
          />
          <span className="text-[.75rem] text-faint">
            {scheduled
              ? "Scheduled — the current price stays in effect until this day."
              : "Applies immediately."}
          </span>
        </label>

        {error && (
          <p className="rounded-control border border-[color-mix(in_srgb,var(--rui-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] px-2.5 py-2 text-[.75rem] text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="cursor-pointer rounded-control border border-border-default px-3 py-1.5 text-[.8125rem] text-body transition-colors hover:bg-surface-raised disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-control bg-accent px-3 py-1.5 text-[.8125rem] font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : scheduled ? "Schedule" : "Apply"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grid                                                                */
/* ------------------------------------------------------------------ */

/** Everything the article endpoint accepts — `currentPrice` writes to price history instead. */
function toArticlePayload(values: ArticleForm): Partial<Article> {
  const { currentPrice: _currentPrice, ...article } = values;
  return article;
}

export function ArticlesGrid({ taxKinds }: { taxKinds: TaxKind[] }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulateFetchError, setSimulateFetchError] = useState(false);
  const [expandedRowIds, setExpandedRowIds] = useState<ReadonlySet<string | number>>(
    () => new Set()
  );
  const [pricingArticle, setPricingArticle] = useState<ArticleRow | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (simulateFetchError) {
        await new Promise((r) => setTimeout(r, 300));
        throw new ApiError("Failed to load articles (HTTP 500)", {
          status: 500,
          code: "FETCH_FAILED",
        });
      }
      setArticles(await mockArticlesApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load articles");
    } finally {
      setIsLoading(false);
    }
  }, [simulateFetchError]);

  useEffect(() => {
    // Sets loading/error synchronously before the first await, the same hand-rolled
    // fetch shape the other demos use. Real screens drive this with the query adapter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  /* Derived, so it must be memoised: a fresh array every render would discard the
     grid's pending local edits. */
  const rows = useMemo<ArticleRow[]>(() => articles.map(toRow), [articles]);

  const taxKindOptions = useMemo<SelectOption[]>(
    () => taxKinds.map((t) => ({ value: t.uuid, label: t.label })),
    [taxKinds]
  );

  const toggleHistory = useCallback((uuid: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }, []);

  const columns = useMemo(
    () => makeArticleColumns({ taxKindOptions }),
    [taxKindOptions]
  );

  /*
   * The history toggle lives in the row actions, not in a column of its own: the
   * actions pill floats over the end of the row on hover, so anything in the last
   * columns sits underneath it and can't be clicked.
   */
  const actionColumnOptions = useMemo(
    () => ({
      renderActions: ({
        row,
        defaults,
      }: {
        row: ArticleRow;
        defaults: {
          EditButton: FC<{ row: ArticleRow }>;
          DeleteButton: FC<{ row: ArticleRow }>;
        };
      }) => (
        <>
          <HistoryButton
            row={row}
            open={expandedRowIds.has(row.uuid)}
            onToggle={toggleHistory}
          />
          <PlanPriceButton row={row} onPlan={setPricingArticle} />
          <defaults.EditButton row={row} />
          <defaults.DeleteButton row={row} />
        </>
      ),
    }),
    [expandedRowIds, toggleHistory]
  );

  const handlePersist = useCallback(
    async (
      mode: "create" | "edit" | "cell",
      values: ArticleForm,
      prev?: ArticleRow
    ): Promise<ArticleRow> => {
      const applyLocally = (saved: Article) => {
        setArticles((list) =>
          list.some((a) => a.uuid === saved.uuid)
            ? list.map((a) => (a.uuid === saved.uuid ? saved : a))
            : [saved, ...list]
        );
        return toRow(saved);
      };

      if (mode === "cell") {
        if (!prev) throw new Error("Cell edit arrived without its row");
        /* Cell edit carries one field, so it always takes effect today. Use the
           Plan-price action to date a change ahead. */
        const saved = await mockArticlesApi.setPrice(
          prev.uuid,
          values.currentPrice
        );
        toast.success(`Price updated for ${saved.code}`);
        return applyLocally(saved);
      }

      if (mode === "create") {
        const saved = await mockArticlesApi.create(toArticlePayload(values));
        toast.success(`Article ${saved.code} created`);
        return applyLocally(saved);
      }

      if (!prev) throw new Error("Edit arrived without its row");
      const saved = await mockArticlesApi.update(
        prev.uuid,
        toArticlePayload(values)
      );
      /* Naming the fields matters here: five of the nine editable fields are hidden
         columns by default, so a save can be entirely invisible in the table. */
      const changed = (
        Object.keys(toArticlePayload(values)) as (keyof Article)[]
      ).filter((k) => String(prev[k] ?? "") !== String(saved[k] ?? ""));
      toast.success(
        changed.length
          ? `${saved.code}: updated ${changed.map(FIELD_LABELS).join(", ")}`
          : `Article ${saved.code} saved — no changes`
      );
      return applyLocally(saved);
    },
    []
  );

  const handleDelete = useCallback(async (row: ArticleRow) => {
    await mockArticlesApi.remove(row.uuid);
    setArticles((list) => list.filter((a) => a.uuid !== row.uuid));
    setExpandedRowIds((prev) => {
      if (!prev.has(row.uuid)) return prev;
      const next = new Set(prev);
      next.delete(row.uuid);
      return next;
    });
    toast.success(`Deleted ${row.code}`);
  }, []);

  const renderExpandedRow = useCallback(
    (row: ArticleRow) => <PriceHistoryPanel article={row} />,
    []
  );

  /* Code, designation, kind and price — enough to identify an article without the
     designation column's width. Combined with Group by this becomes a kanban board. */
  const renderCard = useCallback(
    (row: ArticleRow) => (
      <div className="flex flex-col gap-2 pr-6">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[.75rem] text-muted">{row.code}</span>
          <span className="shrink-0 font-mono text-[.8125rem] font-semibold text-body">
            {formatPrice(row.currentPrice)}
          </span>
        </div>
        <span className="line-clamp-2 text-[.8125rem] font-semibold text-body">
          {row.shortDesignation}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-surface-inset px-2 py-0.5 text-[.6875rem] text-muted">
            {kindLabel(row.articleKind)}
          </span>
          {row.unitSingular && (
            <span className="text-[.6875rem] text-faint">per {row.unitSingular}</span>
          )}
        </div>
      </div>
    ),
    []
  );

  const handlePlannedPrice = useCallback(
    async (unitPrice: number, effectiveFrom: string) => {
      if (!pricingArticle) return;
      const saved = await mockArticlesApi.setPrice(
        pricingArticle.uuid,
        unitPrice,
        effectiveFrom
      );
      setArticles((list) =>
        list.map((a) => (a.uuid === saved.uuid ? saved : a))
      );
      /* Open the history so the new row is visible straight away — a scheduled change
         does not move the Current price column yet, and would otherwise look like a no-op. */
      setExpandedRowIds((prev) => new Set(prev).add(saved.uuid));
      setPricingArticle(null);
      toast.success(
        effectiveFrom === isoDay(0)
          ? `Price updated for ${saved.code}`
          : `Price change scheduled for ${saved.code}`
      );
    },
    [pricingArticle]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-border-default bg-surface-card p-3">
        <p className="text-[.8125rem] text-muted">
          Click a price to reprice in place; hover a row and use the history action
          to open its full price history.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[.8125rem] text-body">
            <input
              type="checkbox"
              checked={simulateFetchError}
              onChange={(e) => setSimulateFetchError(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-border-default"
            />
            <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />
            Simulate fetch error
          </label>
          <button
            type="button"
            onClick={load}
            className="flex cursor-pointer items-center gap-1.5 rounded-control border border-border-default px-3 py-1 text-[.8125rem] text-body transition-colors hover:border-accent hover:text-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Reload
          </button>
        </div>
      </div>

      <DataGrid<ArticleRow, ArticleForm>
        title="Articles"
        subtitle="Catalogue with price history"
        columns={columns}
        zodSchema={articleSchema}
        initialData={rows}
        idAccessor={(row) => row.uuid}
        isLoading={isLoading}
        error={error}
        onRetry={load}
        onPersist={handlePersist}
        onDelete={handleDelete}
        actionColumnOptions={actionColumnOptions}
        editContainer="inline"
        formLayout={{ columns: 3, gap: "gap-6", className: "items-start" }}
        initialSorting={[{ id: "code", desc: false }]}
        pagination={{
          enabled: true,
          pageSizeOptions: [10, 20, 50, 100],
          initialState: { pageIndex: 0, pageSize: 20 },
        }}
        storageKey={STORAGE_KEY}
        groupOptions={GROUP_OPTIONS}
        card={renderCard}
        expandedRowIds={expandedRowIds}
        renderExpandedRow={renderExpandedRow}
      />

      {pricingArticle && (
        <PriceChangeDialog
          article={pricingArticle}
          onCancel={() => setPricingArticle(null)}
          onSubmit={handlePlannedPrice}
        />
      )}
    </div>
  );
}

export function ArticlesGridDemo() {
  /* Tax kinds are the caller's to load — the grid only ever receives the resolved list. */
  return <ArticlesGrid taxKinds={TAX_KINDS} />;
}
