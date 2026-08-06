import { z } from "zod";
import { ARTICLE_KINDS, RECURRENCY_PERIODS } from "./articleData";

/**
 * An emptied number input hands back "", which means "no value" — not 0. Coerce
 * here so the field-level rules below only ever see a number or null.
 */
const toNullableNumber = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
};

/**
 * The editable shape. `uuid` and `prices` are display-only and stay out of it;
 * `currentPrice` is in because click-to-edit persists through this schema, and a key
 * the schema does not declare is stripped from the payload before `onPersist` sees it.
 */
export const articleSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code is at most 20 characters"),
  shortDesignation: z
    .string()
    .min(1, "Short designation is required")
    .max(200, "Short designation is at most 200 characters"),
  longDesignation: z
    .string()
    .max(2000, "Long designation is too long")
    .nullable(),
  unitSingular: z.string().max(10, "Unit is at most 10 characters").nullable(),
  taxKindUuid: z.string().nullable(),
  isTaxIncluded: z.boolean(),
  articleKind: z.enum(ARTICLE_KINDS),
  recurencyPeriod: z.enum(RECURRENCY_PERIODS),
  accountNumber: z.preprocess(
    toNullableNumber,
    z
      .number({ message: "Account number must be a number" })
      .int("Account number must be a whole number")
      .nonnegative("Account number cannot be negative")
      .nullable()
  ),
  currentPrice: z.preprocess(
    toNullableNumber,
    z
      .number({ message: "Price must be a number" })
      .positive("Price must be greater than 0")
      .nullable()
  ),
});

export type ArticleForm = z.infer<typeof articleSchema>;
