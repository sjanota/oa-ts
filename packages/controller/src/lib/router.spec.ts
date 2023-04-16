import { task } from 'fp-ts';
import { OpenAPIV3 } from 'openapi-types';
import { router } from './router';
import { doc, User } from './example-schema';
import { HandlerResponses, HandlerResponse } from './controller';

describe('initial', () => {
  const r = router(doc, {
    getUserById: function (args: {
      readonly id: number;
    }): HandlerResponses<
      | HandlerResponse<200, { readonly name?: string | undefined }>
      | HandlerResponse<404, { readonly error?: string | undefined }>
    > {
      return task.of({ code: 200, body: { name: 'aaa', id: args.id } });
    },
    createUser: function ({ data }: { readonly data: User }): HandlerResponses<
      | HandlerResponse<
          200,
          {
            readonly name?: string | undefined;
            readonly id?: number | undefined;
          }
        >
      | HandlerResponse<404, { readonly error?: string | undefined }>
    > {
      expect(data).toBeDefined();
      return task.of({ code: 200, body: data });
    },
  });

  test('getUserById', async () => {
    expect(
      await r({ path: '/api/users/123', method: OpenAPIV3.HttpMethods.GET })()
    ).toEqual({ code: 200, body: { name: 'aaa', id: 123 } });
  });

  test('createUser', async () => {
    expect(
      await r({
        path: '/api/users',
        method: OpenAPIV3.HttpMethods.POST,
        body: { name: 'aaa', id: 123 },
      })()
    ).toEqual({ code: 200, body: { name: 'aaa', id: 123 } });
  });
});
