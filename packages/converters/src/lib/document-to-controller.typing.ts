import { io, ResolveRef, SplitRef } from './common';
import { ToController } from './document-to-controller';
import { openApi } from './dsl';
import { SchemaToCodec } from './schema-object-io-ts';

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
            description: 'aaaa',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Response',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
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

const _valid = controller.getUserById({ id: 123 });
// @ts-expect-error controler expects number
const _invalid = controller.getUserById({ id: '123' });
