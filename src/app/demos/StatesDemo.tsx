import { useState } from "react";
import { EmptyState } from "../../components/datagrid/ui/GridStates";
import { ErrorState } from "../../components/ErrorState";

/** Empty and error states side by side: same footprint, so a host swaps one for the other in place. */
export function StatesDemo() {
  const [attempts, setAttempts] = useState(0);

  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Empty and error states</h2>
        <p className="text-muted">
          <code>EmptyState</code> says there is nothing to show; <code>ErrorState</code>{" "}
          says the load failed and offers the retry. Both are centred in whatever box
          the host gives them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-surface border border-border-default bg-surface-card">
          <h3 className="px-4 pt-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
            EmptyState
          </h3>
          <EmptyState title="Nothing selected" description="Pick an item on the left." />
        </section>

        <section className="rounded-surface border border-border-default bg-surface-card">
          <h3 className="px-4 pt-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
            ErrorState
          </h3>
          <ErrorState
            title="Configuration could not be loaded"
            message={attempts ? `502 Bad Gateway · attempt ${attempts + 1}` : "502 Bad Gateway"}
            onRetry={() => setAttempts((n) => n + 1)}
          />
        </section>

        <section className="rounded-surface border border-border-default bg-surface-card">
          <h3 className="px-4 pt-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
            EmptyState with an action
          </h3>
          <EmptyState
            title="No matching results"
            description="No rows match the current search."
            action={
              <button
                type="button"
                className="cursor-pointer rounded-control border border-border-default bg-surface-card px-2.5 py-1 text-[.75rem] text-body transition-colors hover:border-accent hover:text-accent"
              >
                Clear search
              </button>
            }
          />
        </section>

        <section className="rounded-surface border border-border-default bg-surface-card">
          <h3 className="px-4 pt-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
            ErrorState without a retry
          </h3>
          <ErrorState message="The record was deleted by another user." />
        </section>
      </div>
    </div>
  );
}
