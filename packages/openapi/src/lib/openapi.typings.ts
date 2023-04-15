import { Document } from './openapi';

const _validDoc: Document = {
  openapi: '3.1.0',
  info: {
    title: 'string',
    version: 'string',
  },
  paths: {
    '/users': {
      get: {
        operationId: 'getUsers',
        responses: {},
      },
      post: {
        operationId: 'createUser',
        responses: {},
      },
    },
    '/users/:id': {
      get: {
        operationId: 'getUserById',
        responses: {},
      },
      put: {
        operationId: 'updateUser',
        responses: {},
      },
    },
  },
};
