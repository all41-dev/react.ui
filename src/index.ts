// Emitted to dist/react.ui.css and exposed as `@all41-dev/react.ui/styles`.
// Consumers import that stylesheet explicitly; nothing here injects styles at runtime.
import "./styles/library.css";

export { DataGrid } from "./components/datagrid/DataGrid";
export { Tooltip } from "./components/Tooltip";
export { LoadingScreen } from "./components/LoadingScreen";
export { toast } from "./utils/toast";

export type { DataGridProps } from "./components/datagrid/DataGrid";

export type { WithMeta, ColumnMeta, EditorKind, Option, SelectOption, ColumnFilterMeta } from "./components/datagrid/types/column";
export type { CrudAdapter, IdLike } from "./components/datagrid/types/crud";
export type { UseTQAdapterParams } from "./components/datagrid/hooks/useTanstackQueryAdapter";

export { useColumnPrefs } from "./components/datagrid/hooks/useColumnPrefs";
export { useCrudAdapter } from "./components/datagrid/hooks/useCrudAdapter";
export { useTanstackQueryAdapter } from "./components/datagrid/hooks/useTanstackQueryAdapter";
export { useConfirm } from "./components/datagrid/hooks/useConfirm";

export type { ActionColumnOpts } from "./components/datagrid/ui/makeActionColumns";
export type { EditContainerKind } from "./components/datagrid/ui/containers/EditContainers";
export type { FormLayoutConfig } from "./components/datagrid/ui/containers/EditFormBody";

export { DataGridContext } from "./components/datagrid/DataGridContext";

export type { LoadingScreenProps } from "./components/LoadingScreen";

export { toTooltipText } from "./components/datagrid/ui/table/CellWithTooltip";

export { FormLayout } from "./components/datagrid/ui/containers/FormLayout";
export { EditFormBody, getRowId } from "./components/datagrid/ui/containers/EditFormBody";
export { EmptyState } from "./components/datagrid/ui/GridStates";
export { computeDefaults } from "./components/datagrid/utils/getAccessorKey";