import cronstrue from "cronstrue";

/**
 * A cron expression as a sentence. An expression the parser refuses is handed
 * back untouched — a schedule the server accepted must stay readable here.
 */
export function humanizeCron(expression: string): string {
  const source = expression.trim();
  if (!source) return "";
  try {
    return cronstrue.toString(source, { use24HourTimeFormat: true });
  } catch {
    return source;
  }
}

/**
 * Whether the expression is one cronstrue can read. The same parser backs
 * `humanizeCron`, so anything this accepts also renders as a sentence.
 */
export function isCron(expression: string): boolean {
  const source = expression.trim();
  if (!source) return false;
  try {
    cronstrue.toString(source);
    return true;
  } catch {
    return false;
  }
}
