import { ToController } from './document-to-controller';

const doc = {
  openapi: '3.1.0',
  info: {
    title: 'test',
    version: '1.0.0',
  },
  paths: {
    '/api/users/:id': {
      get: {
        operationId: 'getUserById',
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
      },
    },
  },
  components: {},
} as const;

declare const controller: ToController<typeof doc>;

const _valid = controller.getUserById({ id: 123 });
// @ts-expect-error controler expects number
const _invalid = controller.getUserById({ id: '123' });
