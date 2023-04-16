import { Equal, Expect } from '@oa-ts/common';
import { OperationObject } from '@oa-ts/openapi';
import { Task } from 'fp-ts/lib/Task';
import {
  Controller,
  FlattenedPaths,
  PathsWithPrefixedMethods,
} from './controller';

type TestPaths = {
  '/users': {
    get: OperationObject & {
      operationId: 'getUsers';
    };
    post: OperationObject & {
      operationId: 'createUser';
    };
  };
  '/users/:id': {
    get: OperationObject & {
      operationId: 'getUserById';
    };
    put: OperationObject & {
      operationId: 'updateUser';
    };
  };
};

type _PathsWithPrefixedMethodsTest = Expect<
  Equal<
    PathsWithPrefixedMethods<TestPaths>,
    {
      '/users': {
        '/users.get': OperationObject & {
          operationId: 'getUsers';
        };
        '/users.post': OperationObject & {
          operationId: 'createUser';
        };
      };
      '/users/:id': {
        '/users/:id.get': OperationObject & {
          operationId: 'getUserById';
        };
        '/users/:id.put': OperationObject & {
          operationId: 'updateUser';
        };
      };
    }
  >
>;

type _FlattenedPathsTest = Expect<
  Equal<
    FlattenedPaths<{
      openapi: '3.1.0';
      info: {
        title: string;
        version: string;
      };
      paths: TestPaths;
    }>,
    {
      '/users.get': OperationObject & {
        operationId: 'getUsers';
      };
      '/users.post': OperationObject & {
        operationId: 'createUser';
      };
      '/users/:id.get': OperationObject & {
        operationId: 'getUserById';
      };
      '/users/:id.put': OperationObject & {
        operationId: 'updateUser';
      };
    }
  >
>;

const doc = {
  openapi: '3.1.0',
  info: {
    title: 'test',
    version: '1.0.0',
  },
  paths: {
    '/users/:id': {
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
    '/users': {
      post: {
        operationId: 'createUser',
        parameters: [
          {
            name: 'data',
            in: 'body',
            schema: { $ref: '#/components/schemas/User' },
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
            schema: { $ref: '#/components/schemas/User' },
          },
        },
      },
      Error: {
        description: 'Error message',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
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
      User: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          id: { type: 'number' },
        },
      },
      Id: {
        type: 'number',
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
          },
        },
      },
    },
  },
} as const;

declare const controller: Controller<typeof doc>;

type Id = number;
type User = { readonly name?: string; readonly id?: number };
type Error = { readonly error?: string };

type _Test = Expect<
  Equal<
    (typeof controller)['getUserById'],
    (args: { readonly id: Id }) => Task<
      | {
          code: 200;
          body: User;
        }
      | {
          code: 404;
          body: Error;
        }
    >
  >
>;
