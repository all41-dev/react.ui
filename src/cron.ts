/*
 * Subpath entry: `@all41-dev/react.ui/cron`.
 *
 * The cron readers live here rather than in the root entry so their parser reaches
 * only a consumer who reads a schedule.
 */
export { humanizeCron, isCron } from "./utils/cron";
