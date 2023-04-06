import { number } from 'fp-ts';
import { identity, pipe } from 'fp-ts/lib/function';
import { Predicate } from 'fp-ts/lib/Predicate';
import * as io from 'io-ts';
import { OpenAPIV3_1 as openapi } from 'openapi-types';
import { ge, gte, le, lte, maximum, minimum } from './common';

type Converter = (schema: openapi.SchemaObject) => io.Any;
type Pipe<T> = (schema: openapi.SchemaObject) => PipeCodec<T>;
type PipeCodec<T> = <C extends io.Type<T>>(c: C) => io.Any;

type ToIoTs<Schema extends openapi.SchemaObject> =
  Schema['type'] extends 'string'
    ? io.StringC
    : Schema['type'] extends 'number'
    ? io.NumberC
    : Schema['type'] extends 'boolean'
    ? io.BooleanC
    : io.Any;

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

export const ioTsOpenapi = <Schema extends openapi.SchemaObject>(
  schema: Schema
): ToIoTs<Schema> => {
  switch (schema.type) {
    case 'string':
      return convertString(schema) as ToIoTs<Schema>;
    case 'number':
      return convertNumber(schema) as ToIoTs<Schema>;
    case 'boolean':
      return convertBoolean(schema) as ToIoTs<Schema>;
  }
  throw new Error();
};
