type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type PickAndFlatten<T, K extends keyof T = keyof T> = {
  [k in keyof UnionToIntersection<T[K]>]: UnionToIntersection<T[K]>[k];
};
