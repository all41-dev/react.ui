import { type FC } from "react";

/** `full` is the branded gate; `quiet` is one ring and the message, for a session check or a route gate. */
export type LoadingScreenVariant = "full" | "quiet";

export interface LoadingScreenProps {
  message?: string;
  variant?: LoadingScreenVariant;
  gradientStart?: string;
  gradientEnd?: string;
  spinnerColor?: string;
  textColor?: string;
  ringColor?: string;
}

/**
 * A full-viewport loading state. Announced as a status, so the message reaches
 * assistive technology once; every animation stops under `prefers-reduced-motion`,
 * the ring included, since the message alone says what is happening.
 */
export const LoadingScreen: FC<LoadingScreenProps> = ({
  message = "Loading...",
  variant = "full",
  gradientStart = "from-accent/20",
  gradientEnd = "to-info/20",
  spinnerColor = "border-t-accent",
  textColor = "text-body",
  ringColor = "border-border-default",
}) => {
  const quiet = variant === "quiet";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 flex flex-col items-center justify-center bg-surface-page text-body z-50"
    >
      <div className="relative flex flex-col items-center">
        {!quiet && (
          <div
            className={`absolute -inset-4 bg-linear-to-r ${gradientStart} ${gradientEnd} blur-xl rounded-full animate-pulse motion-reduce:animate-none`}
          />
        )}

        <div className={`relative ${quiet ? "w-10 h-10 mb-5" : "w-16 h-16 mb-8"}`}>
          <div
            className={`absolute inset-0 ${quiet ? "border-3" : "border-4"} ${ringColor} rounded-full`}
          />
          <div
            className={`absolute inset-0 ${quiet ? "border-3" : "border-4"} ${spinnerColor} border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin motion-reduce:animate-none`}
          />
          {!quiet && (
            <div className="absolute inset-2 border-4 border-t-transparent border-r-info border-b-transparent border-l-transparent rounded-full animate-spin [animation-duration:1.5s] [animation-direction:reverse] motion-reduce:animate-none" />
          )}
        </div>

        <div
          className={`flex flex-col items-center gap-2 ${quiet ? "" : "animate-slide-down"}`}
        >
          <h2
            className={`${quiet ? "text-[.9375rem]" : "text-xl"} font-medium tracking-wide ${textColor}`}
          >
            {message}
          </h2>
          {!quiet && (
            <div className="flex gap-1" aria-hidden="true">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s] motion-reduce:animate-none" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s] motion-reduce:animate-none" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce motion-reduce:animate-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
