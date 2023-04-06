import { fcSchemaObject } from '@karo/arbitrary';
import { either } from 'fp-ts';
import { schemaObjectToArbitrary } from './schema-object-arbitrary';
import { schemaObjectToCodec } from './schema-object-io-ts';
import * as fc from 'fast-check';

const fcSchemaWithValue = fcSchemaObject.chain((schemaObject) =>
  fc.tuple(fc.constant(schemaObject), schemaObjectToArbitrary(schemaObject))
);

test('io-ts and fast-check complements each other', () => {
  fc.assert(
    fc.property(fcSchemaWithValue, ([schemaObject, value]) => {
      const codec = schemaObjectToCodec(schemaObject);
      expect(codec.decode(value)).toEqual(either.right(value));
    }),
    { numRuns: 10000 }
  );
});
