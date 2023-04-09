import { task } from 'fp-ts';
import { OpenAPIV3 } from 'openapi-types';
import { router } from './document-to-controller';
import { doc } from './example-schema';
import { HandlerResponse, HandlerResponses } from './handler';

test('initial', async () => {
  const r = router(doc)({
    getUserById: function (args: {
      readonly id: number;
    }): HandlerResponses<
      | HandlerResponse<200, { readonly name?: string | undefined }>
      | HandlerResponse<404, { readonly error?: string | undefined }>
    > {
      return task.of({ code: 200, body: { name: 'aaa', id: args.id } });
    },
  });

  expect(
    await r({ path: '/api/users/123', method: OpenAPIV3.HttpMethods.GET })()
  ).toEqual({ code: 200, body: { name: 'aaa', id: 123 } });
});
