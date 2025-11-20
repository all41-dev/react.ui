export const idEq = (a?: string | number | null, b?: string | number | null) =>
  String(a ?? "") === String(b ?? "");
export const toId = (v?: string | number | null) => String(v ?? "");