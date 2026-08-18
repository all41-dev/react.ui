import { useState } from "react";
import type { ContainerType, DataSource, FormGrouping, ResourceType } from "./types";

/** Latency and the failure switches the sandbox injects into every request. */
export type Simulation = {
  fetchError: boolean;
  saveError: boolean;
  deleteError: boolean;
  delay: number;
};

const NO_SIMULATION: Simulation = {
  fetchError: false,
  saveError: false,
  deleteError: false,
  delay: 300,
};

export function useSandboxSettings() {
  const [resource, setResource] = useState<ResourceType>("users");
  const [container, setContainer] = useState<ContainerType>("right");
  const [dataSource, setDataSource] = useState<DataSource>("mock-api");
  const [formCols, setFormCols] = useState<1 | 2 | 3>(2);
  const [formGrouping, setFormGrouping] = useState<FormGrouping>("stacked");
  const [expandable, setExpandable] = useState(true);
  const [accordion, setAccordion] = useState(true);
  const [simulation, setSimulation] = useState<Simulation>(NO_SIMULATION);

  /* Only the users columns carry a section map, so the control is inert elsewhere. */
  const grouping: FormGrouping = resource === "users" ? formGrouping : "off";

  const setSim = <K extends keyof Simulation>(key: K, value: Simulation[K]) =>
    setSimulation((prev) => ({ ...prev, [key]: value }));

  const clearSimErrors = () =>
    setSimulation((prev) => ({
      ...prev,
      fetchError: false,
      saveError: false,
      deleteError: false,
    }));

  return {
    resource,
    setResource,
    container,
    setContainer,
    dataSource,
    setDataSource,
    formCols,
    setFormCols,
    formGrouping,
    setFormGrouping,
    grouping,
    expandable,
    setExpandable,
    accordion,
    setAccordion,
    simulation,
    setSim,
    clearSimErrors,
  };
}

export type SandboxSettings = ReturnType<typeof useSandboxSettings>;
