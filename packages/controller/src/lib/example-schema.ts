import { io } from '@oa-ts/common';
import * as dsl from './dsl';
import { SchemaToCodec } from '@oa-ts/schema';

type ComponentsSchemaType<
  Components extends { schemas: Record<string, unknown> },
  Name extends keyof Components['schemas']
> = io.TypeOf<
  SchemaToCodec<Components['schemas'][Name], { components: Components }>
>;

const Error = dsl.schema({
  type: 'object',
  properties: {
    error: {
      type: 'string',
    },
  },
} as const);

const User = dsl.schema({
  type: 'object',
  properties: {
    name: { type: 'string' },
  },
} as const);

const Id = dsl.schema({
  type: 'number',
} as const);

const schemas = {
  User,
  Id,
  Error,
} as const;

const components = dsl.components({
  responses: {
    UserByIdOK: {
      description: 'aaaa',
      content: {
        'application/json': {
          schema: dsl.schemasRef<typeof schemas>()('User'),
        },
      },
    },
    Error: {
      description: 'Error message',
      content: {
        'application/json': {
          schema: dsl.schemasRef<typeof schemas>()('Error'),
        },
      },
    },
  },
  parameters: {
    PathId: {
      name: 'id',
      in: 'path',
      schema: dsl.schemasRef<typeof schemas>()('Id'),
    },
  },
  schemas,
} as const);

export type User = ComponentsSchemaType<typeof components, 'User'>;
export type Error = ComponentsSchemaType<typeof components, 'Error'>;
export type Id = ComponentsSchemaType<typeof components, 'Id'>;

const getUserById = dsl.operation('getUserById', {
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
} as const);

const paths = dsl.paths({
  '/api/users/:id': {
    get: getUserById,
  },
} as const);

export const doc = dsl.openApi({
  openapi: '3.1.0',
  info: {
    title: 'test',
    version: '1.0.0',
  },
  paths,
  components,
} as const);
