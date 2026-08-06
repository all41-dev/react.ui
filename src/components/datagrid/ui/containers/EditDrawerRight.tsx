import {
  OverlayEditContainer,
  type OverlayEditContainerProps,
} from "./OverlayEditContainer";

/** Right-hand drawer, min(460px, 100%), with a scrim and slide-in. */
export function EditDrawerRight<TRow extends object, TForm extends object>(
  props: OverlayEditContainerProps<TRow, TForm>
) {
  return <OverlayEditContainer<TRow, TForm> position="right" {...props} />;
}
