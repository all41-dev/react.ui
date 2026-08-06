import {
  OverlayEditContainer,
  type OverlayEditContainerProps,
} from "./OverlayEditContainer";

/** Centred dialog, min(640px, vw−32px), with a pop-in. */
export function EditModal<TRow extends object, TForm extends object>(
  props: OverlayEditContainerProps<TRow, TForm>
) {
  return <OverlayEditContainer<TRow, TForm> position="center" {...props} />;
}
