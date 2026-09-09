/*
 * Element ids shared by `Tabs` and `TabPanel`: the tab `<prefix>-tab-<key>` controls
 * the panel `<prefix>-panel-<key>`. A host that renders its own panel builds the
 * matching ids from the same prefix.
 */

export const tabId = (idPrefix: string, key: string) => `${idPrefix}-tab-${key}`;

export const tabPanelId = (idPrefix: string, key: string) =>
  `${idPrefix}-panel-${key}`;

export const tabReasonId = (idPrefix: string, key: string) =>
  `${idPrefix}-reason-${key}`;
