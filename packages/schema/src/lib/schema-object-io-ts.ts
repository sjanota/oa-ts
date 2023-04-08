import {
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

type Converter = (
  schema: openapi.SchemaObject,
  resolveRef: ResolveRef
) => Either<Error, io.Any>;
type Pipe<T> = (schema: openapi.SchemaObject) => PipeCodec<T>;
type PipeCodec<T> = <C extends io.Type<T>>(c: C) => io.Any;
type ResolveRef = (ref: string) => Option<openapi.SchemaObject>;

export type SchemaOrReference = openapi.SchemaObject | openapi.ReferenceObject;

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

const applyMinimum: Pipe<number> =
  (schema: openapi.SchemaObject) => (codec) => {
    const min = minimum(schema);
    const compare = schema.exclusiveMinimum ? ge : gte;
    return min !== undefined ? io.refinement(codec, compare(min)) : codec;
  };

const applyMaximum: Pipe<number> =
  (schema: openapi.SchemaObject) => (codec) => {
    const max = maximum(schema);
    const compare = schema.exclusiveMaximum ? le : lte;
    return max !== undefined ? io.refinement(codec, compare(max)) : codec;
  };

const convertString: Converter = () => either.right(io.string);
const convertNumber: Converter = (schema) =>
  pipe(io.number, applyMinimum(schema), applyMaximum(schema), either.right);
const convertBoolean: Converter = () => either.right(io.boolean);
const convertArray = (
  schema: openapi.ArraySchemaObject,
  resolveRef: ResolveRef
) => pipe(convert(schema.items, resolveRef), either.map(io.array));

const convertObject: Converter = (schema, resolveRef) =>
  pipe(
    schema.properties ?? {},
    Object.entries,
    either.traverseArray(([k, v]) =>
      pipe(
        convert(v, resolveRef),
        either.map((codec) => [k, codec])
      )
    ),
    either.map(flow(Object.fromEntries, io.partial))
  );

const convert = (
  schema: openapi.SchemaObject | openapi.ReferenceObject,
  resolveRef: ResolveRef
): Either<Error, io.Any> => {
  if (isRef(schema)) {
    return pipe(
      resolveRef(schema.$ref),
      either.fromOption(() => {
        throw new Error('reference not resolved');
      }),
      either.chain((x) => convert(x, resolveRef))
    );
  }
  switch (schema.type) {
    case 'string':
      return convertString(schema, resolveRef);
    case 'number':
      return convertNumber(schema, resolveRef);
    case 'boolean':
      return convertBoolean(schema, resolveRef);
    case 'array':
      return convertArray(schema, resolveRef);
    case 'object':
      return convertObject(schema, resolveRef);
  }
  throw new Error(`cannot convert type ${schema.type} to Codec`);
};

export const schemaObjectToCodec = <
  Schema extends openapi.SchemaObject | openapi.ReferenceObject
>(
  schema: Schema,
  resolveRef: ResolveRef = () => option.none
): Either<Error, SchemaToCodec<Schema>> =>
  pipe(
    convert(schema, resolveRef),
    either.map((x) => x as SchemaToCodec<Schema>)
  );
