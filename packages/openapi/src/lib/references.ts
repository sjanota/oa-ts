import { Split } from '@oa-ts/common';
import { ReferenceObject } from './openapi';

export type SplitRef<S extends string> = Split<S, '/'>;

export type ResolveRef<Doc, RefTuple> = RefTuple extends ['#', ...infer Rest]
  ? ResolveRef<Doc, Rest>
  : RefTuple extends [infer Key, ...infer Rest]
  ? Key extends keyof Doc
    ? ResolveRef<Doc[Key], Rest>
    : never
  : RefTuple extends []
  ? Doc
  : never;

export type ResolveReference<Doc, Ref extends ReferenceObject> = ResolveRef<
  Doc,
  SplitRef<Ref['$ref']>
>;

export const isRef = (x: unknown): x is ReferenceObject =>
  Object.prototype.hasOwnProperty.call(x, '$ref');
