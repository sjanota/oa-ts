import fc, { Arbitrary } from 'fast-check';
import { array } from 'fp-ts';
import { pipe } from 'fp-ts/lib/function';
import { OpenAPIV3_1 as openapi } from 'openapi-types';
import { maximum, minimum } from './common';

type Converter<T> = (schema: openapi.SchemaObject) => fc.Arbitrary<T>;
type Pipe<T> = (schema: openapi.SchemaObject) => PipeFC<T>;
type PipeFC<T> = (c: fc.Arbitrary<T>) => fc.Arbitrary<T>;

type ToFcObject<Schema extends openapi.SchemaObject> = fc.Arbitrary<{
  [k in keyof Schema['properties']]: Schema['properties'][k] extends openapi.SchemaObject
    ? ToFC<Schema['properties'][k]>
    : never;
}>;

type ToFC<Schema extends openapi.SchemaObject> = Schema['type'] extends 'string'
  ? fc.Arbitrary<string>
  : Schema['type'] extends 'number'
  ? fc.Arbitrary<number>
  : Schema['type'] extends 'boolean'
  ? fc.Arbitrary<boolean>
  : Schema extends openapi.ArraySchemaObject
  ? fc.Arbitrary<Array<ToFC<Schema['items']>>>
  : Schema['type'] extends 'object'
  ? ToFcObject<Schema>
  : never;

const applyExclusiveMaximum: Pipe<number> = (schema) => (a) =>
  schema.exclusiveMaximum ? a.filter((n) => n !== maximum(schema)) : a;

const applyExclusiveMinimum: Pipe<number> = (schema) => (a) =>
  schema.exclusiveMinimum ? a.filter((n) => n !== minimum(schema)) : a;

const convertString: Converter<string> = fc.string;
const convertNumber: Converter<number> = (schema) =>
  pipe(
    fc.double({
      min: minimum(schema),
      max: maximum(schema),
      noNaN: true,
    }),
    applyExclusiveMaximum(schema),
    applyExclusiveMinimum(schema)
  );
const convertBoolean: Converter<boolean> = fc.boolean;

const convertArray = (
  schema: openapi.ArraySchemaObject
): Arbitrary<unknown[]> => fc.array<unknown>(fcOpenapi(schema.items));

const convertObject = (schema: openapi.SchemaObject): Arbitrary<unknown> =>
  schema.properties
    ? fc.record<unknown>(
        pipe(
          schema.properties,
          Object.entries,
          array.map(([k, v]) => [k, convert(v)]),
          Object.fromEntries
        )
      )
    : fc.object();

const convert: Converter<unknown> = (schema) => {
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
  throw new Error(`cannot convert type ${schema.type} to Arbitrary`);
};

export const fcOpenapi = <Schema extends openapi.SchemaObject>(
  schema: Schema
): ToFC<Schema> => convert(schema) as ToFC<Schema>;
