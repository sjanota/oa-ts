import { fc } from '@fast-check/jest';
import { OpenAPIV3_1 as openapi } from 'openapi-types';

type Range = Pick<
  openapi.SchemaObject,
  'minimum' | 'maximum' | 'exclusiveMinimum' | 'exclusiveMaximum'
>;

const fcRange = fc
  .tuple(
    fc.integer(),
    fc.integer({ min: 1, max: 100 }),
    fc.boolean(),
    fc.boolean(),
    fc.boolean()
  )
  .map(
    ([minimum, offset, lowerInclusive, upperInclusive, v4]): Range =>
      v4
        ? {
            minimum,
            maximum: minimum + offset,
            exclusiveMinimum: lowerInclusive || undefined,
            exclusiveMaximum: upperInclusive || undefined,
          }
        : {
            [lowerInclusive ? 'minimum' : 'exclusiveMinimum']: minimum,
            [upperInclusive ? 'maximum' : 'exclusiveMaximum']: minimum + offset,
          }
  );

export const fcNumberSchema = fcRange.map(
  (range): openapi.SchemaObject => ({
    type: 'number',
    ...range,
  })
);

export const fcStringSchema = fc.constant<openapi.SchemaObject>({
  type: 'string' as const,
});

export const fcBooleanSchema = fc.constant<openapi.SchemaObject>({
  type: 'boolean' as const,
});

const recursive = fc.letrec<{
  properties: string[];
  array: openapi.ArraySchemaObject;
  object: openapi.SchemaObject;
  schema: openapi.SchemaObject;
}>((tie) => ({
  properties: fc.array(fc.string()),
  array: fc.record({
    type: fc.constant('array' as const),
    items: tie('schema'),
  }),
  object: fc.record({
    type: fc.constant('object' as const),
    properties: fc.dictionary(
      tie('properties').chain(fc.constantFrom),
      tie('schema')
    ),
  }),
  schema: fc.oneof(
    fcNumberSchema,
    fcBooleanSchema,
    fcStringSchema,
    tie('array'),
    tie('object')
  ),
}));

export const fcArraySchema = recursive.array;
export const fcobjectSchema = recursive.object;
export const fcSchemaObject = recursive.schema;
