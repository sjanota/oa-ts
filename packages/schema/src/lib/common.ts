import { isNumber } from 'fp-ts/lib/number';
import { SchemaObject } from '@oa-ts/openapi';

export const minimum = (schema: SchemaObject) =>
  isNumber(schema.exclusiveMinimum) ? schema.exclusiveMinimum : schema.minimum;

export const maximum = (schema: SchemaObject) =>
  isNumber(schema.exclusiveMaximum) ? schema.exclusiveMaximum : schema.maximum;

export const gte = (y: number) => (x: number) => x >= y;
export const ge = (y: number) => (x: number) => x > y;
export const lte = (y: number) => (x: number) => x <= y;
export const le = (y: number) => (x: number) => x < y;
