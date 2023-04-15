import { Equal, Expect } from './common';
import { PickAndFlatten } from './utility-types';

type _Test = Expect<
  Equal<
    PickAndFlatten<{
      '/users': {
        '/users.get': {
          operationId: 'getUsers';
        };
        '/users.post': {
          operationId: 'createUser';
        };
      };
      '/users/:id': {
        '/users/:id.get': {
          operationId: 'getUserById';
        };
        '/users/:id.put': {
          operationId: 'updateUser';
        };
      };
    }>,
    {
      '/users.get': {
        operationId: 'getUsers';
      };
      '/users.post': {
        operationId: 'createUser';
      };
      '/users/:id.get': {
        operationId: 'getUserById';
      };
      '/users/:id.put': {
        operationId: 'updateUser';
      };
    }
  >
>;
