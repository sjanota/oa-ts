import { Equal, Expect, io } from '@oa-ts/common';
import { either } from 'fp-ts';
import { schemaObjectToCodec } from './schema-object-io-ts';

type CodecType<E> = E extends either.Right<infer C>
  ? C extends io.Any
    ? io.TypeOf<C>
    : never
  : never;

test('type number', () => {
  const schema = { type: 'number' } as const;
  const codec = schemaObjectToCodec(schema);
  type _Test = Expect<Equal<CodecType<typeof codec>, number>>;
});

test('type string', () => {
  const schema = { type: 'string' } as const;
  const codec = schemaObjectToCodec(schema);
  type _Test = Expect<Equal<CodecType<typeof codec>, string>>;
});

test('type boolean', () => {
  const schema = { type: 'boolean' } as const;
  const codec = schemaObjectToCodec(schema);
  type _Test = Expect<Equal<CodecType<typeof codec>, boolean>>;
});

test('type simple array', () => {
  const schema = { type: 'array', items: { type: 'number' } } as const;
  const codec = schemaObjectToCodec(schema);
  type _Test = Expect<Equal<CodecType<typeof codec>, number[]>>;
});

test('type flat object', () => {
  const schema = {
    type: 'object',
    properties: { age: { type: 'number' }, name: { type: 'string' } },
  } as const;
  const codec = schemaObjectToCodec(schema);
  type _Test = Expect<
    Equal<
      CodecType<typeof codec>,
      { readonly age?: number; readonly name?: string }
    >
  >;
});

test('type nested object', () => {
  const schema = {
    type: 'object',
    properties: {
      age: { type: 'number' },
      name: {
        type: 'object',
        properties: {
          first: { type: 'string' },
          last: { type: 'string' },
        },
      },
    },
  } as const;
  const codec = schemaObjectToCodec(schema);
  type _Test = Expect<
    Equal<
      CodecType<typeof codec>,
      {
        readonly age?: number;
        readonly name?: { readonly first?: string; readonly last?: string };
      }
    >
  >;
});

test('type array of object', () => {
  const schema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        age: { type: 'number' },
        name: { type: 'string' },
      },
    },
  } as const;
  const codec = schemaObjectToCodec(schema);
  type _Test = Expect<
    Equal<
      CodecType<typeof codec>,
      {
        readonly age?: number;
        readonly name?: string;
      }[]
    >
  >;
});
