import {
  OverlayEditContainer,
  type OverlayEditContainerProps,
} from "./OverlayEditContainer";

/** Centered dialog: min(640px, vw−32px), pop-in per spec. */
export function EditModal<TRow extends object, TForm extends object>(
  props: OverlayEditContainerProps<TRow, TForm>
) {
  return <OverlayEditContainer<TRow, TForm> position="center" {...props} />;
}
