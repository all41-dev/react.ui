import type { FacetChip } from "./facets";

export type GridView = "list" | "cards";

export type DataGridToolbarProps = {
  title: string;
  subtitle?: string;
  /** Row count shown in the pill next to the title. */
  count?: number;
  toolbar?: React.ReactNode;
  editContainer?: "right" | "bottom" | "modal" | "inline" | "none";
  error: string | Error | null;
  onAddClick: () => void;
  onRetry?: () => void | Promise<void>;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  /** Whether any column declares filter meta — hides the Filters toggle when none do. */
  hasFilterableColumns?: boolean;
  filtersShown?: boolean;
  activeFilterCount?: number;
  onToggleFilters?: () => void;
  /** Drops every column filter at once, from the menu's Filter section. */
  onClearFilters?: () => void;
  /** The Columns popover. A slot rather than props, so the toolbar stays presentational. */
  columnsControl?: React.ReactNode;
  /** Puts columns, search, filters, sorting, grouping and page back to default. */
  onResetView?: () => void;
  /** Nothing to undo: the command is rendered disabled rather than dropped. */
  viewIsDefault?: boolean;
  /** Rendered only when the consumer supplies a `card` renderer. */
  view?: GridView;
  onViewChange?: (v: GridView) => void;
  /** Group-by select; rendered only when the consumer supplies `groupOptions`. */
  groupOptions?: { key: string; label: string }[];
  groupBy?: string;
  onGroupByChange?: (key: string) => void;
  /** Active filters and grouping, rendered as pills inside the search field. */
  facets?: FacetChip[];
};
