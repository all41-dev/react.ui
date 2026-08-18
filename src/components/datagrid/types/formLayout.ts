/** Field width inside a group's grid, or inside the form grid when the field has no group. */
export type FormColSpan = 1 | 2 | 3 | 4 | "full";

/**
 * How a section arranges its fields. `"cards"` flows each field as a filled chip, which
 * suits switches; `"grid"` places them on the form's column tracks, where every field is
 * expected to line its label and control up with its neighbours.
 */
export type FormGroupVariant = "grid" | "cards";

/** A captioned section of the edit form, holding the columns that name it. */
export type FormFieldGroup = {
  /** Matches `meta.formLayout.group` on the columns that belong here. */
  id: string;
  /** Section heading. Defaults to the id. */
  label?: string;
  /** Width in the form grid. Defaults to `"full"`. */
  groupSpan?: FormColSpan;
  /**
   * Columns in the group's own grid. Defaults to the number of form columns the group
   * spans, so fields keep the form's column rhythm at any width.
   */
  columns?: 1 | 2 | 3 | 4;
  /** Position among the form's blocks. Defaults to the lowest `order` of its fields. */
  order?: number;
  /** `"cards"` flows each field as a filled chip rather than gridding them; suits switches. */
  variant?: FormGroupVariant;
  className?: string;
};

export type FormLayoutConfig = {
  /** Columns in the form grid (default 2). Collapses to one below `md`. */
  columns?: 1 | 2 | 3 | 4;
  /** Tailwind gap class for the field grids (default `"gap-4"`). */
  gap?: string;
  /** Additional classes for the form grid. */
  className?: string;
  /** Sections for the columns that declare `meta.formLayout.group`. */
  groups?: FormFieldGroup[];
};

/**
 * Group that collects switch fields left without an explicit `group`. Declaring it in
 * `groups` overrides its defaults — heading "Options", card variant, rendered last.
 */
export const OPTIONS_GROUP_ID = "options";
