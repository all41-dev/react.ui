export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700" role="status" aria-live="polite">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/>
        <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none"/>
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
}

export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-2">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3 h-4 animate-pulse rounded bg-gray-200" />
          <div className="col-span-2 h-4 animate-pulse rounded bg-gray-200" />
          <div className="col-span-4 h-4 animate-pulse rounded bg-gray-200" />
          <div className="col-span-1 h-4 animate-pulse rounded bg-gray-200" />
          <div className="col-span-2 h-4 animate-pulse rounded bg-gray-200" />
        </div>
      </td>
    </tr>
  );
}
