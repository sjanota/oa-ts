import { isNumber } from 'fp-ts/lib/number';
import { OpenAPIV3_1 as openapi } from 'openapi-types';
import * as io from 'io-ts';

export { io, openapi };

export const minimum = (schema: openapi.SchemaObject) =>
  isNumber(schema.exclusiveMinimum) ? schema.exclusiveMinimum : schema.minimum;

export const maximum = (schema: openapi.SchemaObject) =>
  isNumber(schema.exclusiveMaximum) ? schema.exclusiveMaximum : schema.maximum;

export const gte = (y: number) => (x: number) => x >= y;
export const ge = (y: number) => (x: number) => x > y;
export const lte = (y: number) => (x: number) => x <= y;
export const le = (y: number) => (x: number) => x < y;

export type Expect<T extends true> = T;
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? true
  : false;

export type DeepReadonly<T> = T extends Array<infer I>
  ? ReadonlyArray<DeepReadonly<I>>
  : T extends object
  ? Readonly<{ [k in keyof T]: DeepReadonly<T[k]> }>
  : T;

export type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ''
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];

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

export type ResolveReference<
  Doc,
  Ref extends openapi.ReferenceObject
> = ResolveRef<Doc, SplitRef<Ref['$ref']>>;
