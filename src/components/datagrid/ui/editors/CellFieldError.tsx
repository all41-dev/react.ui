/**
 * A cell editor's error text. Visually the error is the ring on the control and the
 * tooltip over it; this span is what `aria-describedby` reads, and it announces when
 * the error lands, since a row has no error line to show it in.
 */
export function CellFieldError({
  id,
  message,
}: {
  id: string;
  message: string | undefined;
}) {
  if (!message) return null;
  return (
    <span id={id} role="alert" className="sr-only">
      {message}
    </span>
  );
}
