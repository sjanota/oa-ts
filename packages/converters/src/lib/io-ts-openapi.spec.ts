/* eslint-disable @typescript-eslint/no-unused-vars */
import { fc, test } from '@fast-check/jest';
import { fcSchemaObject } from '@karo/arbitrary';
import { either } from 'fp-ts';
import * as io from 'io-ts';
import { fcOpenapi } from './fc-openapi';
import { ioTsOpenapi } from './io-ts-openapi';

const fcNonNumber = fc.anything().filter((x) => typeof x !== 'number');

const fcSchemaWithValue = fcSchemaObject.chain((schemaObject) =>
  fc.tuple(fc.constant(schemaObject), fcOpenapi(schemaObject))
);

it('correctly types string', () => {
  const stringCodec = ioTsOpenapi({ type: 'string' });
  // @ts-expect-error number is not string
  const failure: io.TypeOf<typeof codec> = 123;
  const success: io.TypeOf<typeof stringCodec> = '123';
});

test('io-ts and fast-check complements each other', () => {
  fc.assert(
    fc.property(fcSchemaWithValue, ([schemaObject, value]) => {
      const codec = ioTsOpenapi(schemaObject);
      expect(codec.decode(value)).toEqual(either.right(value));
    }),
    { numRuns: 10000 }
  );
});

describe('number', () => {
  const codec = ioTsOpenapi({ type: 'number' });

  // @ts-expect-error string is not a number
  const failure: io.TypeOf<typeof codec> = '123';
  const success: io.TypeOf<typeof codec> = 123;

  test('fails on non number', () => {
    fc.assert(
      fc.property(fcNonNumber, (nonNumber) => {
        expect(codec.decode(nonNumber)).toEqual(either.left(expect.any(Array)));
      })
    );
  });

  test('minimum', () => {
    const codec = ioTsOpenapi({ type: 'number', minimum: 100 });
    expect(codec.decode(123)).toEqual(either.right(123));
    expect(codec.decode(80)).toEqual(either.left(expect.any(Array)));
  });
});

it('boolean', () => {
  const codec = ioTsOpenapi({ type: 'boolean', enum: [true, false] });
  // @ts-expect-error string is not a number
  const failure: io.TypeOf<typeof codec> = '123';

  const success: io.TypeOf<typeof codec> = true;
  expect(codec.decode(true)).toEqual(either.right(true));
  expect(codec.decode('123')).toEqual(either.left(expect.any(Array)));
});
