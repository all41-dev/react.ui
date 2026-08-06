import type { SelectOption, WithMeta } from "../../../components/datagrid/types/column";
import type { ArticleRow } from "./articleData";
import type { ArticleForm } from "./articleSchema";

export const ARTICLE_KIND_OPTIONS: SelectOption[] = [
  { value: "time-based", label: "Time based" },
  { value: "fixed-price", label: "Fixed price" },
  { value: "recurrent", label: "Recurrent" },
  { value: "package", label: "Package" },
];

export const RECURRENCY_OPTIONS: SelectOption[] = [
  { value: "year", label: "Yearly" },
  { value: "quarter", label: "Quarterly" },
  { value: "month", label: "Monthly" },
  { value: "none", label: "None" },
];

const labelOf = (options: SelectOption[], value: unknown) =>
  options.find((o) => o.value === value)?.label ?? "—";

/** Blank text fields are stored as null rather than "", matching the nullable columns. */
const nullIfEmpty = (v: unknown) => (v === "" || v === undefined ? null : v);

export function formatPrice(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isNaN(n) ? "—" : `${n.toFixed(2)} CHF`;
}

export function makeArticleColumns({
  taxKindOptions,
}: {
  taxKindOptions: SelectOption[];
}): WithMeta<ArticleRow, ArticleForm>[] {
  return [
    {
      accessorKey: "code",
      header: "Code",
      size: 120,
      meta: {
        editor: "text",
        label: "Article code",
        required: true,
        mono: true,
        tooltip: true,
        formLayout: { order: 1, colSpan: 1 },
        filter: { type: "text", placeholder: "Search code…", debounceMs: 300 },
      },
    },
    {
      accessorKey: "shortDesignation",
      header: "Short designation",
      size: 280,
      meta: {
        editor: "text",
        label: "Short designation",
        required: true,
        tooltip: true,
        formLayout: { order: 2, colSpan: 2 },
        filter: {
          type: "text",
          placeholder: "Filter designation…",
          debounceMs: 300,
        },
      },
    },
    {
      accessorKey: "longDesignation",
      header: "Long designation",
      size: 320,
      meta: {
        editor: "textarea",
        label: "Long designation",
        tooltip: true,
        fromForm: nullIfEmpty,
        editorProps: { rows: 4 },
        formLayout: { order: 3, colSpan: "full" },
      },
    },
    {
      accessorKey: "articleKind",
      header: "Kind",
      size: 140,
      meta: {
        editor: "select",
        label: "Article kind",
        required: true,
        options: ARTICLE_KIND_OPTIONS,
        default: "fixed-price",
        /* Display only — `computeDefaults` seeds the editor from the raw value, so the
           select still opens on the stored key rather than on this label. */
        format: (value) => labelOf(ARTICLE_KIND_OPTIONS, value),
        formLayout: { order: 4, colSpan: 1 },
        filter: {
          type: "select",
          placeholder: "Any kind",
          options: ARTICLE_KIND_OPTIONS,
        },
      },
    },
    {
      accessorKey: "recurencyPeriod",
      header: "Recurrency",
      size: 140,
      meta: {
        editor: "select",
        label: "Recurrency period",
        required: true,
        options: RECURRENCY_OPTIONS,
        default: "none",
        format: (value) => labelOf(RECURRENCY_OPTIONS, value),
        formLayout: { order: 5, colSpan: 1 },
        filter: {
          type: "select",
          placeholder: "Any period",
          options: RECURRENCY_OPTIONS,
        },
      },
    },
    {
      accessorKey: "unitSingular",
      header: "Unit",
      size: 90,
      meta: {
        editor: "text",
        label: "Unit (singular)",
        fromForm: nullIfEmpty,
        formLayout: { order: 6, colSpan: 1 },
      },
    },
    {
      accessorKey: "taxKindUuid",
      header: "Tax kind",
      meta: {
        editor: "select",
        label: "Tax kind",
        options: taxKindOptions,
        format: (value) => labelOf(taxKindOptions, value),
        fromForm: nullIfEmpty,
        formLayout: { order: 7, colSpan: 1 },
      },
    },
    {
      accessorKey: "isTaxIncluded",
      header: "Tax incl.",
      meta: {
        editor: "switch",
        label: "Tax included in price",
        align: "center",
        format: (value) => (value ? "Yes" : "No"),
        formLayout: { order: 8, colSpan: 1 },
      },
    },
    {
      accessorKey: "accountNumber",
      header: "Account",
      meta: {
        editor: "number",
        label: "Account number",
        align: "right",
        mono: true,
        format: (value) => (value === null || value === undefined ? "—" : String(value)),
        formLayout: { order: 9, colSpan: 1 },
      },
    },
    {
      accessorKey: "currentPrice",
      header: "Current price",
      size: 160,
      enableSorting: true,
      meta: {
        editor: "number",
        label: "Current price",
        cellEdit: true,
        /* Editing happens in the cell popover only — the article form writes the article,
           this field writes a price-history row. */
        visibleInForm: false,
        align: "right",
        mono: true,
        format: formatPrice,
        /* `format` renders "168.00 CHF"; the editor has to open on 168, and the save has
           to hand back a number. Hence both hooks alongside it. */
        toForm: (value) => (value === null || value === undefined ? "" : value),
        fromForm: (value) =>
          value === "" || value === null || value === undefined
            ? null
            : Number(value),
      },
    },
  ];
}
