import {
  DeepReadonly,
  ge,
  gte,
  isRef,
  le,
  lte,
  maximum,
  minimum,
  ResolveReference,
} from '@oa-ts/common';
import { either, option } from 'fp-ts';
import { Either } from 'fp-ts/lib/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import { Option } from 'fp-ts/Option';
import * as io from 'io-ts';
import { OpenAPIV3_1 as openapi } from 'openapi-types';
import { NumberFromString } from 'io-ts-types';

type Converter = (
  schema: DeepReadonly<openapi.SchemaObject>,
  resolveRef: ResolveRef,
  fromString: boolean
) => Either<Error, io.Any>;
type Pipe<T> = (schema: DeepReadonly<openapi.SchemaObject>) => PipeCodec<T>;
type PipeCodec<T> = <C extends io.Type<T, any>>(c: C) => io.Any;
type ResolveRef = (ref: string) => Option<DeepReadonly<openapi.SchemaObject>>;

export type SchemaOrReference =
  | DeepReadonly<openapi.SchemaObject>
  | DeepReadonly<openapi.ReferenceObject>;

type SchemaObjectToCodec<
  Doc,
  Schema extends openapi.SchemaObject
> = Schema['type'] extends 'string'
  ? io.StringC
  : Schema['type'] extends 'number'
  ? io.NumberC
  : Schema['type'] extends 'boolean'
  ? io.BooleanC
  : Schema extends openapi.ArraySchemaObject
  ? io.ArrayC<SchemaToCodec<Schema['items'], Doc>>
  : Schema['type'] extends 'object'
  ? io.PartialC<{
      [k in keyof Schema['properties']]: Schema['properties'][k] extends openapi.SchemaObject
        ? SchemaToCodec<Schema['properties'][k], Doc>
        : never;
    }>
  : io.Any;

export type SchemaToCodec<
  Schema,
  Doc = Record<string, never>
> = Schema extends openapi.ReferenceObject
  ? SchemaToCodec<ResolveReference<Doc, Schema>, Doc>
  : Schema extends openapi.SchemaObject
  ? SchemaObjectToCodec<Doc, Schema>
  : never;

const applyMinimum: Pipe<number> = (schema) => (codec) => {
  const min = minimum(schema);
  const compare = schema.exclusiveMinimum ? ge : gte;
  return min !== undefined ? io.refinement(codec, compare(min)) : codec;
};

const applyMaximum: Pipe<number> = (schema) => (codec) => {
  const max = maximum(schema);
  const compare = schema.exclusiveMaximum ? le : lte;
  return max !== undefined ? io.refinement(codec, compare(max)) : codec;
};

const convertString: Converter = () => either.right(io.string);
const convertNumber: Converter = (schema, _, fromString) =>
  pipe(
    fromString ? NumberFromString : io.number,
    applyMinimum(schema),
    applyMaximum(schema),
    either.right
  );
const convertBoolean: Converter = () => either.right(io.boolean);
const convertArray = (
  schema: DeepReadonly<openapi.ArraySchemaObject>,
  resolveRef: ResolveRef,
  fromString: boolean
) => pipe(convert(schema.items, resolveRef, fromString), either.map(io.array));

const convertObject: Converter = (schema, resolveRef, fromString) =>
  pipe(
    schema.properties ?? {},
    Object.entries,
    either.traverseArray(([k, v]) =>
      pipe(
        convert(v, resolveRef, fromString),
        either.map((codec) => [k, codec])
      )
    ),
    either.map(flow(Object.fromEntries, io.partial))
  );

const convert = (
  schema:
    | DeepReadonly<openapi.SchemaObject>
    | DeepReadonly<openapi.ReferenceObject>,
  resolveRef: ResolveRef,
  fromString: boolean
): Either<Error, io.Any> => {
  if (isRef(schema)) {
    return pipe(
      resolveRef(schema.$ref),
      either.fromOption(() => {
        throw new Error('reference not resolved');
      }),
      either.chain((x) => convert(x, resolveRef, fromString))
    );
  }
  switch (schema.type) {
    case 'string':
      return convertString(schema, resolveRef, fromString);
    case 'number':
      return convertNumber(schema, resolveRef, fromString);
    case 'boolean':
      return convertBoolean(schema, resolveRef, fromString);
    case 'array':
      return convertArray(schema, resolveRef, fromString);
    case 'object':
      return convertObject(schema, resolveRef, fromString);
  }
  throw new Error(`cannot convert type ${schema.type} to Codec`);
};

export const schemaObjectToCodec = <
  Schema extends
    | DeepReadonly<openapi.SchemaObject>
    | DeepReadonly<openapi.ReferenceObject>
>(
  schema: Schema,
  resolveRef: ResolveRef = () => option.none,
  fromString = false
): Either<Error, SchemaToCodec<Schema>> =>
  pipe(
    convert(schema, resolveRef, fromString),
    either.map((x) => x as SchemaToCodec<Schema>)
  );
