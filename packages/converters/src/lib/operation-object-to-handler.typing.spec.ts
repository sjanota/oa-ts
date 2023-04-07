import { Equal, Expect } from './common';
import { operation } from './dsl';
import { Handler, HandlerResponse } from './handler';
import { ToHandler } from './operation-object-to-handler';

test('basic scenario', () => {
  const getUserByIdSpec = operation('getUserById', {
    parameters: [{ name: 'id', in: 'path', schema: { type: 'number' } }],
    responses: {
      200: {
        description: 'aaaa',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      },
    },
  } as const);

  type A = ToHandler<typeof getUserByIdSpec>;
  type Expected = Handler<
    'getUserById',
    { readonly id: number },
    HandlerResponse<200, { readonly name?: string | undefined }>
  >;
  type _Test = Expect<Equal<A, Expected>>;
});
