import { array } from 'fp-ts';
import { pipe } from 'fp-ts/lib/function';
import * as io from 'io-ts';
import { OpenAPIV3_1 as openapi } from 'openapi-types';
import {
  ge,
  gte,
  le,
  lte,
  maximum,
  minimum,
  ResolveReference,
} from '@oa-ts/common';

type Converter = (schema: openapi.SchemaObject) => io.Any;
type Pipe<T> = (schema: openapi.SchemaObject) => PipeCodec<T>;
type PipeCodec<T> = <C extends io.Type<T>>(c: C) => io.Any;

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

const convertString: Converter = () => io.string;
const convertNumber: Converter = (schema) =>
  pipe(io.number, applyMinimum(schema), applyMaximum(schema));
const convertBoolean: Converter = () => io.boolean;
const convertArray = (schema: openapi.ArraySchemaObject) =>
  io.array(convert(schema.items));

const convertObject: Converter = (schema) =>
  io.partial(
    pipe(
      schema.properties ?? {},
      Object.entries,
      array.map(([k, v]) => [k, convert(v)]),
      Object.fromEntries
    )
  );

const convert = (schema: openapi.SchemaObject): io.Any => {
  switch (schema.type) {
    case 'string':
      return convertString(schema);
    case 'number':
      return convertNumber(schema);
    case 'boolean':
      return convertBoolean(schema);
    case 'array':
      return convertArray(schema);
    case 'object':
      return convertObject(schema);
  }
  throw new Error(`cannot convert type ${schema.type} to Codec`);
};

export const schemaObjectToCodec = <Schema extends openapi.SchemaObject>(
  schema: Schema
): SchemaToCodec<Schema> => convert(schema) as SchemaToCodec<Schema>;
