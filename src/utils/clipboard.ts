/*
 * Writes text to the clipboard. The async API exists only in a secure context
 * (https or localhost), so a plain-http host such as the dev server falls back
 * to the legacy command on a hidden, selected textarea. Answers whether the
 * text was copied.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Denied or unavailable after all: try the legacy path below.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.focus();
  area.select();
  let copied: boolean;
  try {
    // The deprecated command is the only clipboard write on plain http.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
}
