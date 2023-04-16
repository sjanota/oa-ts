import { Equal, Expect } from '@oa-ts/common';
import { OperationObject } from '@oa-ts/openapi';
import { Task } from 'fp-ts/lib/Task';
import { Controller, FlattenedPaths, PathsWithPrefixedMethods } from './router';
import { doc, Error, Id, User } from './example-schema';

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

declare const controller: Controller<typeof doc>;

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
