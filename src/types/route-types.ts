export type TopSection<TopKey extends string> = TopKey | "partners" | "customers";

export type TopPageConfig<TopKey extends string> = {
  key: TopKey;
  path: string;
  end?: boolean;
  area?: "top" | "bottom";
};

export type SidebarRouteConfig<
  TopKey extends string,
> = {
  topPages: readonly TopPageConfig<TopKey>[];
  defaultTop: TopKey;
};
