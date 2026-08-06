import {
  OverlayEditContainer,
  type OverlayEditContainerProps,
} from "./OverlayEditContainer";

/** Bottom sheet: full width, max 82vh, rounded top, slide-up. */
export function EditDrawerBottom<TRow extends object, TForm extends object>(
  props: OverlayEditContainerProps<TRow, TForm>
) {
  return <OverlayEditContainer<TRow, TForm> position="bottom" {...props} />;
}
