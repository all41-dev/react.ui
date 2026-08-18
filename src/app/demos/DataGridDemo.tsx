import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { DataGrid } from "../../components/datagrid/DataGrid";
import { columnsFor } from "./sandbox/columns";
import { USER_FORM_GROUPS } from "./sandbox/formGroups";
import { groupOptionsFor } from "./sandbox/groupOptions";
import { schemaFor } from "./sandbox/schemas";
import { useExpandedRows } from "./sandbox/useExpandedRows";
import { useSandboxData } from "./sandbox/useSandboxData";
import { useSandboxSettings } from "./sandbox/useSandboxSettings";
import { ConfigPanel } from "./sandbox/ui/ConfigPanel";
import { ResourcePicker } from "./sandbox/ui/ResourcePicker";
import { DemoRowCard, ExpandedJson } from "./sandbox/ui/rowViews";
import { SimulationBanner } from "./sandbox/ui/SimulationBanner";

/** A sandbox over the JSONPlaceholder endpoints for exercising every grid feature. */
export function DataGridDemo() {
  const settings = useSandboxSettings();
  const { resource, grouping, expandable, simulation } = settings;
  const { expandedRowIds, toggle, collapseAll } = useExpandedRows(settings.accordion);

  const { data, setData, loading, error, reload, persist, remove } = useSandboxData({
    resource,
    dataSource: settings.dataSource,
    simulation,
    onLoaded: collapseAll,
  });

  /* The grid rebuilds its context whenever an object prop changes identity, so the
     derived props are memoized even though nothing else here is. */
  const columns = useMemo(() => columnsFor(resource, grouping), [resource, grouping]);
  const schema = useMemo(() => schemaFor(resource), [resource]);
  const formLayout = useMemo(
    () => ({
      columns: settings.formCols,
      gap: "gap-4",
      groups: grouping === "off" ? undefined : USER_FORM_GROUPS[grouping],
    }),
    [settings.formCols, grouping]
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="border-b border-border-default pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" />
          <h2 className="text-2xl font-bold text-body">
            JSONPlaceholder API & DataGrid Sandbox
          </h2>
        </div>
        <p className="text-muted text-sm mt-1">
          Test virtual scrolling, pagination, form containers, and error handling across
          all JSONPlaceholder REST endpoints.
        </p>
      </div>

      {settings.dataSource === "mock-api" && (
        <ResourcePicker
          active={resource}
          loadedCount={data.length}
          onSelect={settings.setResource}
        />
      )}

      <ConfigPanel
        settings={settings}
        onReload={reload}
        onClearData={() => setData([])}
        onAccordionChange={(accordion) => {
          settings.setAccordion(accordion);
          collapseAll();
        }}
      />

      <SimulationBanner simulation={simulation} onClear={settings.clearSimErrors} />

      <DataGrid
        key={resource}
        title={`${resource.toUpperCase()} dataset`}
        subtitle={`/${resource} · JSONPlaceholder`}
        columns={columns}
        zodSchema={schema}
        initialData={data}
        isLoading={loading}
        error={error}
        onRetry={reload}
        idAccessor={(row) => row.id}
        selectable
        card={(row) => <DemoRowCard row={row} resource={resource} />}
        groupOptions={groupOptionsFor(resource)}
        editContainer={settings.container}
        onPersist={persist}
        onDelete={remove}
        formLayout={formLayout}
        renderExpandedRow={
          expandable ? (row) => <ExpandedJson row={row} resource={resource} /> : undefined
        }
        expandedRowIds={expandable ? expandedRowIds : undefined}
        onRowClick={expandable ? (row) => toggle(row.id) : undefined}
      />
    </div>
  );
}
