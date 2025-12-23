import { toast as s } from "sonner";
const DONE = 2500;

export const toast = {
  loading: (m: string, opts?: any) => s.loading(m, { duration: Infinity, ...opts }),
  success: (m: string, opts?: any) => s.success(m, { duration: DONE, ...opts }),
  error:   (m: string, opts?: any) => s.error(m,   { duration: DONE, ...opts }),
  settleSuccess: (id: string|number, m: string, opts?: any) => s.success(m, { id, duration: DONE, ...opts }),
  settleError:   (id: string|number, m: string, opts?: any) => s.error(m,   { id, duration: DONE, ...opts }),
  dismiss: s.dismiss,
};