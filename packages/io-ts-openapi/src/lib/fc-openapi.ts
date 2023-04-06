import { identity, pipe } from 'fp-ts/lib/function';
import { Predicate } from 'fp-ts/lib/Predicate';
import * as io from 'io-ts';
import { OpenAPIV3_1 as openapi } from 'openapi-types';
import fc from 'fast-check';
import { isNumber } from 'fp-ts/lib/number';
import { isBoolean } from 'fp-ts/lib/boolean';
import { maximum, minimum } from './common';

type Converter<T> = (schema: openapi.SchemaObject) => fc.Arbitrary<T>;
type Pipe<T> = (schema: openapi.SchemaObject) => PipeFC<T>;
type PipeFC<T> = (c: fc.Arbitrary<T>) => fc.Arbitrary<T>;

type ToFC<Schema extends openapi.SchemaObject> = Schema['type'] extends 'string'
  ? fc.Arbitrary<string>
  : Schema['type'] extends 'number'
  ? fc.Arbitrary<number>
  : Schema['type'] extends 'boolean'
  ? fc.Arbitrary<boolean>
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

export const fcOpenapi = <Schema extends openapi.SchemaObject>(
  schema: Schema
): ToFC<Schema> => {
  switch (schema.type) {
    case 'string':
      return convertString(schema) as ToFC<Schema>;
    case 'number':
      return convertNumber(schema) as ToFC<Schema>;
    case 'boolean':
      return convertBoolean(schema) as ToFC<Schema>;
  }
  throw new Error();
};
