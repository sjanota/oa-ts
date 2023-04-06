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
