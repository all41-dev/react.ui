import { type DemoRow, rowField, type ResourceType } from "../types";

/** Which two or three fields the card shows, per resource. */
const CARD_DETAILS: Record<ResourceType, string[]> = {
  users: ["email", "role", "status"],
  posts: ["userId", "body"],
  comments: ["email", "postId"],
  todos: ["userId", "completed"],
  albums: ["userId"],
  photos: ["albumId"],
};

const DETAIL_LABELS: Record<string, string> = {
  email: "Email",
  role: "Role",
  status: "Status",
  userId: "User",
  postId: "Post",
  albumId: "Album",
  body: "Body",
  completed: "Done",
};

const detailText = (key: string, value: unknown) => {
  if (key === "completed") return value ? "Yes" : "No";
  if (key === "body") return String(value ?? "").slice(0, 80);
  return String(value ?? "—");
};

/** Card body for the cards view — the primary label plus a couple of details. */
export function DemoRowCard({ row, resource }: { row: DemoRow; resource: ResourceType }) {
  const title =
    rowField(row, "name") ?? rowField(row, "title") ?? rowField(row, "email") ?? `#${row.id}`;

  return (
    <div className="flex flex-col gap-2 pr-6">
      <span className="truncate text-sm font-semibold text-body">{String(title)}</span>
      <dl className="flex flex-col gap-1">
        {CARD_DETAILS[resource].map((key) => (
          <div key={key} className="flex gap-2 text-xs">
            <dt className="shrink-0 text-faint">{DETAIL_LABELS[key] ?? key}</dt>
            <dd className="min-w-0 truncate text-muted">
              {detailText(key, rowField(row, key))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Expanded-row content: the raw record, for checking what the grid actually holds. */
export function ExpandedJson({
  row,
  resource,
}: {
  row: DemoRow;
  resource: ResourceType;
}) {
  return (
    <div className="bg-surface-inset border border-border-default rounded-lg p-4 space-y-2 text-sm">
      <div className="flex items-center justify-between text-xs font-semibold text-muted uppercase tracking-wider">
        <span>Resource JSON Details ({resource})</span>
        <span>ID: #{row.id}</span>
      </div>
      <pre className="bg-surface-raised text-success p-3 rounded-md text-xs font-mono overflow-x-auto">
        {JSON.stringify(row, null, 2)}
      </pre>
    </div>
  );
}
