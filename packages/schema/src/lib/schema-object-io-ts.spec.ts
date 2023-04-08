import { either, option } from 'fp-ts';
import { schemaObjectToCodec } from './schema-object-io-ts';

test('resolve reference', () => {
  const resolve = jest.fn().mockReturnValue(option.some({ type: 'string' }));
  const codec = schemaObjectToCodec(
    {
      type: 'array',
      items: {
        $ref: '#/components/schema/Id',
      },
    },
    resolve
  );
  expect(either.isRight(codec)).toBe(true);
  if (either.isRight(codec)) {
    expect(codec.right.decode(['a', 'b'])).toEqual(either.right(['a', 'b']));
    expect(codec.right.decode(['a', 2])).toEqual(
      either.left(expect.any(Array))
    );
  }
});
