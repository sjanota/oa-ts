import { Task } from 'fp-ts/lib/Task';
import { Equal, Expect } from './common';
import { ToController } from './document-to-controller';
import { openApi } from './dsl';

const doc = openApi({
  openapi: '3.1.0',
  info: {
    title: 'test',
    version: '1.0.0',
  },
  paths: {
    '/api/users/:id': {
      get: {
        operationId: 'getUserById',
        parameters: [
          {
            $ref: '#/components/parameters/PathId',
          },
        ],
        responses: {
          200: {
            $ref: '#/components/responses/UserByIdOK',
          },
          404: {
            summary: 'User not found',
            $ref: '#/components/responses/Error',
          },
        },
      },
    },
  },
  components: {
    responses: {
      UserByIdOK: {
        description: 'aaaa',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Response',
            },
          },
        },
      },
      Error: {
        description: 'Error message',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    parameters: {
      PathId: {
        name: 'id',
        in: 'path',
        schema: { $ref: '#/components/schemas/Id' },
      },
    },
    schemas: {
      Response: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      Id: {
        type: 'number',
      },
    },
  },
} as const);

declare const controller: ToController<typeof doc>;

type _Test = Expect<
  Equal<
    (typeof controller)['getUserById'],
    (args: { readonly id: number }) => Task<
      | {
          code: 200;
          body: { readonly name?: string | undefined };
        }
      | {
          code: 404;
          body: { readonly error?: string | undefined };
        }
    >
  >
>;
