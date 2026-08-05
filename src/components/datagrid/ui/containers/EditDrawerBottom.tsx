import {
  OverlayEditContainer,
  type OverlayEditContainerProps,
} from "./OverlayEditContainer";

/**
 * Bottom sheet: full-width, max 82vh, rounded top, slide-up per spec.
 * (Previously wrapped the right drawer's fixed-right shell — so it rendered on
 * the wrong side — and dropped formLayout on the way through. #20)
 */
export function EditDrawerBottom<TRow extends object, TForm extends object>(
  props: OverlayEditContainerProps<TRow, TForm>
) {
  return <OverlayEditContainer<TRow, TForm> position="bottom" {...props} />;
}
