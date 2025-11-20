export type IdLike = string | number;

export interface CrudAdapter<T, Id extends IdLike = IdLike> {
  list: () => Promise<T[]>;
  create: (values: Partial<T>) => Promise<T>;
  update: (id: Id, values: Partial<T>) => Promise<T>;
  remove: (id: Id) => Promise<void>;
  getId: (row: T) => Id;
}
