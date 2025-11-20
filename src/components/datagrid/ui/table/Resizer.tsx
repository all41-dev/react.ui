export function Resizer({
  getResizeHandler,
  canResize,
}: {
  getResizeHandler: () => any;
  canResize: boolean;
}) {
  if (!canResize) return null;

  const handler = getResizeHandler();

  return (
    <>
      <div
        aria-hidden
        className="absolute top-0 bottom-0 right-0 w-px pointer-events-none bg-gray-200 z-10"
      />
      <div
        onMouseDown={handler}
        onTouchStart={handler}
        className="absolute top-0 bottom-0 right-0 w-2 cursor-col-resize select-none opacity-0 group-hover/hd:opacity-100 touch-none z-10"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
      />
    </>
  );
}
