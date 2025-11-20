import { useId, cloneElement, isValidElement } from "react";
import { Tooltip as RT } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

type TooltipProps = {
  content: string;
  children: React.ReactElement;
  place?: "top" | "right" | "bottom" | "left";
  delayShow?: number;
  offset?: number;
  id?: string;
};

export function Tooltip({
  content,
  children,
  place = "right",
  delayShow = 50,
  offset = 8,
  id: forcedId,
}: TooltipProps) {
  const uid = (forcedId ?? useId()).replace(/:/g, "_");

  if (!isValidElement(children)) {
    console.error("Tooltip expects a single valid ReactElement as child.");
    return null;
  }

  const childWithProps = cloneElement(children as React.ReactElement<any>, {
    id: uid,
    "data-tooltip-content": content,
  });

  return (
    <>
      {childWithProps}
      <RT
        anchorSelect={`#${uid}`}
        place={place}
        delayShow={delayShow}
        offset={offset}
        positionStrategy="fixed"
        className="!pointer-events-none"
        style={{ zIndex: 10000 }}
      />
    </>
  );
}
