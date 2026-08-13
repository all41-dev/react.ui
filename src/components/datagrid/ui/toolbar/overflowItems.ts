export type OverflowMenuProps = {
  hasFilterableColumns?: boolean;
  filtersShown?: boolean;
  activeFilterCount?: number;
  onToggleFilters?: () => void;
  /** Drops every column filter at once. Rendered only while some are active. */
  onClearFilters?: () => void;
  /** The Columns popover, rendered as a row. It owns its own trigger and panel. */
  columnsControl?: React.ReactNode;
  /** Puts columns, search, filters, sorting, grouping and page back to default. */
  onResetView?: () => void;
  viewIsDefault?: boolean;
  groupOptions?: { key: string; label: string }[];
  groupBy?: string;
  onGroupByChange?: (key: string) => void;
  onRetry?: () => void | Promise<void>;
  /** Welded to the right edge of the search field: square left corners, shared border. */
  attached?: boolean;
};

/**
 * Whether the menu has anything to show. Its own module because the search bar has to
 * square off its right edge only when a trigger is actually welded to it — asking here
 * keeps that decision in one place instead of letting the two copies drift. (Alongside
 * the component it also cost a `react-refresh/only-export-components` warning.)
 */
export function hasOverflowItems({
  hasFilterableColumns,
  onToggleFilters,
  columnsControl,
  groupOptions,
  onGroupByChange,
  onRetry,
  onResetView,
}: OverflowMenuProps): boolean {
  return !!(
    (hasFilterableColumns && onToggleFilters) ||
    (groupOptions && groupOptions.length > 0 && onGroupByChange) ||
    columnsControl ||
    onRetry ||
    onResetView
  );
}
