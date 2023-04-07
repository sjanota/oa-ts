import { DeepReadonly, openapi } from './common';
import { OperationObject, ToHandler } from './operation-object-to-handler';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type PickAndFlatten<T, K extends keyof T = keyof T> = UnionToIntersection<T[K]>;

type PathsWithPrefixedMethods<Paths extends DeepReadonly<openapi.PathsObject>> =
  {
    [p in keyof Paths]: p extends string
      ? {
          [m in keyof Paths[p] as m extends string
            ? `${p}.${m}`
            : '']: Paths[p][m];
        }
      : never;
  };

type FlattenedPaths<Doc extends DeepReadonly<openapi.Document>> =
  Doc['paths'] extends DeepReadonly<openapi.PathsObject>
    ? PickAndFlatten<PathsWithPrefixedMethods<Doc['paths']>>
    : never;

type ControllerFromFlattenedPaths<Operations> = PickAndFlatten<{
  [k in keyof Operations]: Operations[k] extends DeepReadonly<OperationObject>
    ? ToHandler<Operations[k]>
    : 'dupa';
}>;

export type ToController<Doc extends DeepReadonly<openapi.Document>> =
  ControllerFromFlattenedPaths<FlattenedPaths<Doc>>;
