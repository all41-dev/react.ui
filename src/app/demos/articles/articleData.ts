/**
 * Mock article catalogue for the Articles grid demo. Shapes follow
 * ops.server's `db-article.ts` and `db-article-price-history.ts`.
 */

export type UUID = string;

export const ARTICLE_KINDS = [
  "time-based",
  "fixed-price",
  "recurrent",
  "package",
] as const;
export type ArticleKind = (typeof ARTICLE_KINDS)[number];

export const RECURRENCY_PERIODS = ["year", "quarter", "month", "none"] as const;
export type RecurrencyPeriod = (typeof RECURRENCY_PERIODS)[number];

export interface TaxKind {
  uuid: UUID;
  code: string;
  label: string;
  rate: number;
}

export interface ArticlePriceHistory {
  uuid: UUID;
  articleUuid: UUID;
  unitPrice: number | null;
  /** The day this price stops applying. `null` means it never expires. */
  dateTo: string | null;
}

export interface Article {
  uuid: UUID;
  code: string;
  shortDesignation: string;
  longDesignation: string | null;
  unitSingular: string | null;
  taxKindUuid: string | null;
  isTaxIncluded: boolean;
  articleKind: ArticleKind;
  accountNumber: number | null;
  recurencyPeriod: RecurrencyPeriod;
  /* `offerTag` exists on the server model but is deliberately not surfaced here. */
  prices: ArticlePriceHistory[];
}

/**
 * What the grid actually renders. `currentPrice` is denormalised onto the row
 * because click-to-edit resolves its form field through `accessorKey`
 * (`CellEditPopover`) while the save resolves through the column id
 * (`useGridMutations`) — the two only agree when the column has a real
 * `accessorKey`, so a derived id-only column cannot be cell-edited.
 */
export type ArticleRow = Article & { currentPrice: number | null };

export const TAX_KINDS: TaxKind[] = [
  { uuid: "tk-standard", code: "STD", label: "Standard 8.1%", rate: 8.1 },
  { uuid: "tk-reduced", code: "RED", label: "Reduced 2.6%", rate: 2.6 },
  { uuid: "tk-lodging", code: "LOD", label: "Lodging 3.8%", rate: 3.8 },
  { uuid: "tk-exempt", code: "EXO", label: "Exempt 0%", rate: 0 },
];

/** Midnight today, local. */
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/*
 * Dates here are calendar days, never instants. Both helpers below stay in local time
 * on purpose: `toISOString()` converts local midnight back to UTC and reports the
 * PREVIOUS day at any positive offset, and `new Date("2026-08-06")` parses as UTC
 * midnight, which lands on the wrong side of a comparison against local midnight.
 * Mixing either one in makes a row closed today still read as live.
 */

/** A Date rendered as its local calendar day. */
function formatDayIso(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** The local calendar day `days` from now, as YYYY-MM-DD. */
export function isoDay(days = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return formatDayIso(d);
}

/** A YYYY-MM-DD day (or the day part of a timestamp) as local midnight. */
export function dayValue(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
}

/**
 * `dateTo` is exclusive: it is the day the price stopped applying, so a row dated
 * today is already superseded. That is what lets a reprice close the outgoing row
 * with today's date and have the incoming one be current immediately.
 */
export function isExpired(p: ArticlePriceHistory): boolean {
  return p.dateTo !== null && dayValue(p.dateTo) <= startOfToday();
}

/**
 * The live price: of the rows that have not expired, the one expiring soonest.
 * A `null` dateTo never expires, so it only wins when nothing is dated ahead of it.
 */
export function currentPriceRow(
  prices: ArticlePriceHistory[]
): ArticlePriceHistory | null {
  const live = prices.filter((p) => !isExpired(p));
  if (live.length === 0) return null;
  return live.reduce((best, p) => {
    const bestAt = best.dateTo ? dayValue(best.dateTo) : Infinity;
    const pAt = p.dateTo ? dayValue(p.dateTo) : Infinity;
    return pAt < bestAt ? p : best;
  });
}

export function toRow(article: Article): ArticleRow {
  return { ...article, currentPrice: currentPriceRow(article.prices)?.unitPrice ?? null };
}

let priceSeq = 0;
function price(
  articleUuid: string,
  unitPrice: number | null,
  dateTo: string | null
): ArticlePriceHistory {
  priceSeq += 1;
  return { uuid: `prc-${priceSeq}`, articleUuid, unitPrice, dateTo };
}

const SEED: Article[] = [
  {
    uuid: "art-001",
    code: "DEV-SR",
    shortDesignation: "Senior developer",
    longDesignation:
      "Senior software engineering work billed by the hour, including code review and technical design.",
    unitSingular: "h",
    taxKindUuid: "tk-standard",
    isTaxIncluded: false,
    articleKind: "time-based",
    accountNumber: 3400,
    recurencyPeriod: "none",
    prices: [
      price("art-001", 155, isoDay(-400)),
      price("art-001", 168, null),
    ],
  },
  {
    uuid: "art-002",
    code: "DEV-JR",
    shortDesignation: "Junior developer",
    longDesignation: "Implementation work under supervision.",
    unitSingular: "h",
    taxKindUuid: "tk-standard",
    isTaxIncluded: false,
    articleKind: "time-based",
    accountNumber: 3400,
    recurencyPeriod: "none",
    prices: [price("art-002", 96, null)],
  },
  {
    uuid: "art-003",
    code: "ARCH",
    shortDesignation: "Solution architecture",
    longDesignation: "Architecture review and target-state design.",
    unitSingular: "day",
    taxKindUuid: "tk-standard",
    isTaxIncluded: false,
    articleKind: "time-based",
    accountNumber: 3410,
    recurencyPeriod: "none",
    /* A scheduled increase: the dated row is live until it expires, then the open row takes over. */
    prices: [
      price("art-003", 1450, isoDay(45)),
      price("art-003", 1600, null),
    ],
  },
  {
    uuid: "art-004",
    code: "HOST-S",
    shortDesignation: "Hosting — small instance",
    longDesignation: "Managed hosting, 2 vCPU / 4 GB, daily backup.",
    unitSingular: "mo",
    taxKindUuid: "tk-standard",
    isTaxIncluded: true,
    articleKind: "recurrent",
    accountNumber: 3200,
    recurencyPeriod: "month",
    prices: [price("art-004", 89, null)],
  },
  {
    uuid: "art-005",
    code: "HOST-L",
    shortDesignation: "Hosting — large instance",
    longDesignation: "Managed hosting, 8 vCPU / 32 GB, hourly backup, 24/7 on-call.",
    unitSingular: "mo",
    taxKindUuid: "tk-standard",
    isTaxIncluded: true,
    articleKind: "recurrent",
    accountNumber: 3200,
    recurencyPeriod: "month",
    prices: [
      price("art-005", 340, isoDay(-120)),
      price("art-005", 385, null),
    ],
  },
  {
    uuid: "art-006",
    code: "SUP-GOLD",
    shortDesignation: "Support contract — Gold",
    longDesignation: "4h response, business hours, unlimited tickets.",
    unitSingular: "year",
    taxKindUuid: "tk-standard",
    isTaxIncluded: false,
    articleKind: "recurrent",
    accountNumber: 3210,
    recurencyPeriod: "year",
    prices: [price("art-006", 12000, null)],
  },
  {
    uuid: "art-007",
    code: "SUP-BASE",
    shortDesignation: "Support contract — Basic",
    longDesignation: null,
    unitSingular: "year",
    taxKindUuid: "tk-standard",
    isTaxIncluded: false,
    articleKind: "recurrent",
    accountNumber: 3210,
    recurencyPeriod: "year",
    prices: [price("art-007", 3600, null)],
  },
  {
    uuid: "art-008",
    code: "AUDIT",
    shortDesignation: "Security audit",
    longDesignation: "Fixed-scope penetration test with written report.",
    unitSingular: "pce",
    taxKindUuid: "tk-standard",
    isTaxIncluded: false,
    articleKind: "fixed-price",
    accountNumber: 3420,
    recurencyPeriod: "none",
    prices: [price("art-008", 8500, null)],
  },
  {
    uuid: "art-009",
    code: "MIGR",
    shortDesignation: "Data migration",
    longDesignation: "One-off migration including dry run and cutover.",
    unitSingular: "pce",
    taxKindUuid: "tk-standard",
    isTaxIncluded: false,
    articleKind: "fixed-price",
    accountNumber: 3420,
    recurencyPeriod: "none",
    /* Every price has expired — the grid shows no current price for this one. */
    prices: [
      price("art-009", 4200, isoDay(-200)),
      price("art-009", 4600, isoDay(-30)),
    ],
  },
  {
    uuid: "art-010",
    code: "PKG-START",
    shortDesignation: "Starter package",
    longDesignation: "Setup, two workshops and 20 hours of implementation.",
    unitSingular: "pce",
    taxKindUuid: "tk-reduced",
    isTaxIncluded: true,
    articleKind: "package",
    accountNumber: 3100,
    recurencyPeriod: "none",
    prices: [price("art-010", 5900, null)],
  },
  {
    uuid: "art-011",
    code: "PKG-SCALE",
    shortDesignation: "Scale-up package",
    longDesignation: "Everything in Starter plus quarterly review and priority support.",
    unitSingular: "pce",
    taxKindUuid: "tk-reduced",
    isTaxIncluded: true,
    articleKind: "package",
    accountNumber: 3100,
    recurencyPeriod: "quarter",
    prices: [price("art-011", 14500, null)],
  },
  {
    uuid: "art-012",
    code: "TRAIN",
    shortDesignation: "On-site training day",
    longDesignation: "Full-day training for up to 12 participants.",
    unitSingular: "day",
    taxKindUuid: "tk-lodging",
    isTaxIncluded: false,
    articleKind: "fixed-price",
    accountNumber: 3430,
    recurencyPeriod: "none",
    prices: [price("art-012", 2400, null)],
  },
  {
    uuid: "art-013",
    code: "LIC-SEAT",
    shortDesignation: "Software licence — per seat",
    longDesignation: "Named-user licence, billed annually in advance.",
    unitSingular: "seat",
    taxKindUuid: "tk-exempt",
    isTaxIncluded: false,
    articleKind: "recurrent",
    accountNumber: 3000,
    recurencyPeriod: "year",
    prices: [
      price("art-013", 240, isoDay(-700)),
      price("art-013", 265, isoDay(-90)),
      price("art-013", 289, null),
    ],
  },
  {
    uuid: "art-014",
    code: "TRAVEL",
    shortDesignation: "Travel expenses",
    longDesignation: "Reimbursed at cost, no margin applied.",
    unitSingular: "km",
    taxKindUuid: "tk-exempt",
    isTaxIncluded: false,
    articleKind: "fixed-price",
    accountNumber: 6500,
    recurencyPeriod: "none",
    /* No price rows at all — exercises the empty "—" rendering. */
    prices: [],
  },
];

/* ------------------------------------------------------------------ */
/* Mock API                                                            */
/* ------------------------------------------------------------------ */

let store: Article[] = SEED.map((a) => ({ ...a, prices: [...a.prices] }));

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let uuidSeq = 100;
const nextUuid = (prefix: string) => `${prefix}-${(uuidSeq += 1)}`;

export const mockArticlesApi = {
  async list(latencyMs = 400): Promise<Article[]> {
    await delay(latencyMs);
    return store.map((a) => ({ ...a, prices: [...a.prices] }));
  },

  async create(values: Partial<Article>, latencyMs = 300): Promise<Article> {
    await delay(latencyMs);
    const created: Article = {
      uuid: nextUuid("art"),
      code: "",
      shortDesignation: "",
      longDesignation: null,
      unitSingular: null,
      taxKindUuid: null,
      isTaxIncluded: false,
      articleKind: "fixed-price",
      accountNumber: null,
      recurencyPeriod: "none",
      prices: [],
      ...values,
    };
    store = [created, ...store];
    return created;
  },

  async update(
    uuid: string,
    values: Partial<Article>,
    latencyMs = 300
  ): Promise<Article> {
    await delay(latencyMs);
    let updated: Article | undefined;
    store = store.map((a) => {
      if (a.uuid !== uuid) return a;
      updated = { ...a, ...values, uuid: a.uuid, prices: a.prices };
      return updated;
    });
    if (!updated) throw new Error(`Article ${uuid} not found`);
    return updated;
  },

  async remove(uuid: string, latencyMs = 300): Promise<void> {
    await delay(latencyMs);
    store = store.filter((a) => a.uuid !== uuid);
  },

  /**
   * Records a price change. The outgoing row is closed on `effectiveFrom` and a new
   * open-ended row carries the new amount — the old price stays readable in the
   * history, which is the whole reason the table exists. Nothing is overwritten.
   *
   * `effectiveFrom` in the future schedules the change: the outgoing row keeps the
   * earliest unexpired `dateTo`, so it stays current until that day arrives and the
   * new row takes over on its own. Today (the default) switches immediately.
   *
   * Clearing the price closes the live row without opening a replacement, leaving the
   * article with no current price from that day.
   */
  async setPrice(
    uuid: string,
    unitPrice: number | null,
    effectiveFrom: string = isoDay(0),
    latencyMs = 300
  ): Promise<Article> {
    await delay(latencyMs);
    let updated: Article | undefined;
    store = store.map((a) => {
      if (a.uuid !== uuid) return a;

      const live = currentPriceRow(a.prices);
      const closed = live
        ? a.prices.map((p) =>
            p.uuid === live.uuid ? { ...p, dateTo: effectiveFrom } : p
          )
        : a.prices;

      const prices =
        unitPrice === null
          ? closed
          : [
              ...closed,
              {
                uuid: nextUuid("prc"),
                articleUuid: a.uuid,
                unitPrice,
                dateTo: null,
              },
            ];

      updated = { ...a, prices };
      return updated;
    });
    if (!updated) throw new Error(`Article ${uuid} not found`);
    return updated;
  },
};
