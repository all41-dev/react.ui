import { useEffect, useState } from "react";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Skeleton } from "../../components/Skeleton";
import { useLoadingIndicator } from "../../hooks/useLoadingIndicator";
import { LoadingClockContext } from "../../hooks/loadingClock";
import { DelayedRender } from "../../components/DelayedRender";
import { LazyCodeEditor, LazyCodeView } from "../../components/LazyCode";
import { Segmented } from "./sandbox/ui/controls";

const BUTTON =
  "cursor-pointer rounded-control border border-border-default bg-surface-card px-3 py-1.5 text-[.8125rem] text-body transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

const DURATIONS = [100, 400, 2000] as const;

/**
 * The loading primitives side by side: the skeleton bar, the indicator hook that
 * decides when a placeholder is worth showing, and the full-screen gate in both
 * variants.
 */
export function LoadingDemo() {
  const [screen, setScreen] = useState<"full" | "quiet" | "custom" | null>(null);

  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Loading states</h2>
        <p className="text-muted">
          <code>Skeleton</code> holds a place; <code>useLoadingIndicator</code> says
          when holding it is worth showing; <code>LoadingScreen</code> gates a whole
          view. The grid stands its rows in the same way.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-surface border border-border-default bg-surface-card p-4">
          <h3 className="mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
            Skeleton
          </h3>
          <p className="mb-4 text-[.8125rem] text-muted">
            One shimmer bar, sized by utilities. A text line by default; taller and
            squarer for a title, a card, a thumbnail.
          </p>
          <div className="space-y-3">
            <Skeleton className="h-4 w-56 rounded-md" />
            <Skeleton className="w-4/5" />
            <Skeleton className="w-3/5" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-12 w-12 rounded-control" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="w-1/2" />
                <Skeleton className="w-3/4" />
              </div>
            </div>
          </div>
        </section>

        <IndicatorPlayground />

        <section className="rounded-surface border border-border-default bg-surface-card p-4 md:col-span-2">
          <h3 className="mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
            LoadingScreen
          </h3>
          <p className="mb-4 text-[.8125rem] text-muted">
            The full variant is the branded gate; the quiet one is a single ring and the
            message, for a session check where the brand has nothing to add. Click the
            screen to close it.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={BUTTON} onClick={() => setScreen("full")}>
              Show full
            </button>
            <button type="button" className={BUTTON} onClick={() => setScreen("quiet")}>
              Show quiet
            </button>
            <button type="button" className={BUTTON} onClick={() => setScreen("custom")}>
              Show custom colours
            </button>
          </div>
        </section>
      </div>

      {screen && (
        // The gate has no close of its own; the demo wraps it so a click dismisses it.
        <div onClick={() => setScreen(null)}>
          {screen === "full" && <LoadingScreen message="Loading your workspace…" />}
          {screen === "quiet" && (
            <LoadingScreen variant="quiet" message="Checking your session…" />
          )}
          {screen === "custom" && (
            <LoadingScreen
              message="Custom colours…"
              gradientStart="from-indigo-500/30"
              gradientEnd="to-purple-500/30"
              spinnerColor="border-t-indigo-500"
              textColor="text-indigo-100"
              ringColor="border-indigo-900"
            />
          )}
        </div>
      )}

      <LazyCodeSection />
    </div>
  );
}

const SAMPLE = JSON.stringify({ customer: { id: 7, name: "Contoso" }, paid: true }, null, 2);

/**
 * The code view and editor behind a dynamic import. Each is rendered on request, so the
 * first press loads the engine; `DelayedRender` keeps the placeholder back for the delay.
 */
function LazyCodeSection() {
  const [shown, setShown] = useState<"view" | "editor" | null>(null);
  const [body, setBody] = useState("return obj.customer.name;");
  const [clockAt, setClockAt] = useState<number | null>(null);

  return (
    <section className="rounded-surface border border-border-default bg-surface-card p-4">
      <h3 className="mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
        LazyCodeView, LazyCodeEditor, DelayedRender
      </h3>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[.8125rem]">
        <button type="button" className={LAZY_BUTTON} onClick={() => setShown("view")}>
          Render the view
        </button>
        <button type="button" className={LAZY_BUTTON} onClick={() => setShown("editor")}>
          Render the editor
        </button>
        <button type="button" className={LAZY_BUTTON} onClick={() => setShown(null)}>
          Unmount
        </button>
      </div>
      <div className="min-h-24 rounded-control border border-border-default">
        {shown === "view" && <LazyCodeView value={SAMPLE} language="json" aria-label="Sample record" />}
        {shown === "editor" && (
          <LazyCodeEditor value={body} onChange={setBody} language="javascript" rows={4} aria-label="Function body" />
        )}
      </div>

      <p className="mb-2 mt-5 text-[.8125rem] text-muted">
        Under a <code>LoadingClockContext</code> an indicator counts its delay from the clock: this one
        mounts 200 ms into a wait and shows 50 ms later, not 250.
      </p>
      <button type="button" className={LAZY_BUTTON} onClick={() => setClockAt(Date.now() - 200)}>
        Mount 200 ms into a wait
      </button>
      {clockAt !== null && (
        <LoadingClockContext key={clockAt} value={{ since: clockAt, settled: () => false }}>
          <DelayedRender>
            <Skeleton className="mt-3 h-4 w-60 rounded-md" />
          </DelayedRender>
        </LoadingClockContext>
      )}
    </section>
  );
}

const LAZY_BUTTON =
  "h-8 cursor-pointer rounded-control border border-border-default px-3 text-[.8125rem] hover:bg-surface-raised";

/**
 * A fake load of a chosen length against the hook's defaults (250 ms delay, 400 ms
 * minimum): a short one shows no placeholder at all, a medium one shows it for the
 * minimum, a long one for as long as it lasts.
 */
function IndicatorPlayground() {
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(400);
  const [loading, setLoading] = useState(false);
  const shown = useLoadingIndicator(loading);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [loading, duration]);

  return (
    <section className="rounded-surface border border-border-default bg-surface-card p-4">
      <h3 className="mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
        useLoadingIndicator
      </h3>
      <p className="mb-4 text-[.8125rem] text-muted">
        Nothing for a wait under 250 ms; once shown, the placeholder stays at least
        400 ms. Pick a length and load.
      </p>
      <div className="mb-4 text-xs">
        <Segmented
          label="Simulated load"
          options={DURATIONS}
          value={duration}
          onChange={setDuration}
          disabled={loading}
          render={(ms) => (ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`)}
        />
      </div>
      <button
        type="button"
        className={`${BUTTON} mb-4`}
        disabled={loading}
        onClick={() => setLoading(true)}
      >
        {loading ? "Loading…" : "Load"}
      </button>
      <div
        className="min-h-20 rounded-control border border-border-default bg-surface-inset p-3"
        aria-busy={loading || undefined}
      >
        {shown ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="w-4/5" />
            <Skeleton className="w-3/5" />
          </div>
        ) : loading ? null : (
          <>
            <p className="text-[.875rem] font-semibold">Quarterly summary</p>
            <p className="mt-1 text-[.8125rem] text-muted">
              Twelve accounts reviewed, three flagged for follow-up.
            </p>
          </>
        )}
      </div>
      <p className="mt-2 text-[.6875rem] text-faint">
        indicator: {shown ? "shown" : "hidden"} · load: {loading ? "in flight" : "idle"}
      </p>
    </section>
  );
}
