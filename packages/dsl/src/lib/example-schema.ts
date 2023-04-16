import * as dsl from './dsl';

const Error = dsl.schema('Error', {
  type: 'object',
  properties: {
    error: {
      type: 'string',
    },
  },
});
type Error = dsl.TypeOfSchema<typeof Error>;

const Id = dsl.schema('Id', {
  type: 'number',
});
type Id = dsl.TypeOfSchema<typeof Id>;

const User = dsl.schema('User', {
  type: 'object',
  properties: {
    name: { type: 'string' },
    id: Id,
  },
});
type User = dsl.TypeOfSchema<typeof User>;

const Users = dsl.schema('Users', {
  type: 'array',
  items: User,
});
type Users = dsl.TypeOfSchema<typeof Users>;

declare const x: dsl.Components<[typeof Id, typeof Error, typeof User]>;

const UserByIdOK = dsl.response('UserByIdOK', {
  description: 'aaaa',
  content: {
    'application/json': {
      schema: dsl.ref(User),
    },
  },
});

// const ErrorResponse = dsl.response('ErrorResponse', {
//   description: 'Error message',
//   content: {
//     'application/json': {
//       schema: dsl.ref(Error),
//     },
//   },
// });

// const PathId = dsl.parameter('PathId', {
//   name: 'id',
//   in: 'path',
//   schema: dsl.ref(Id),
// });

// const getUserById = dsl.operation('getUserById', {
//   parameters: [
//     {
//       $ref: '#/components/parameters/PathId',
//     },
//   ],
//   responses: {
//     200: {
//       $ref: '#/components/responses/UserByIdOK',
//     },
//     404: {
//       summary: 'User not found',
//       $ref: '#/components/responses/Error',
//     },
//   },
// } as const);

// const createUser = dsl.operation('createUser', {
//   parameters: [
//     {
//       name: 'data',
//       in: 'body',
//       schema: dsl.schemasRef<typeof schemas>()('User'),
//     },
//   ],
//   responses: {
//     200: {
//       $ref: '#/components/responses/UserByIdOK',
//     },
//     404: {
//       summary: 'User not found',
//       $ref: '#/components/responses/Error',
//     },
//   },
// } as const);

// const paths = dsl.paths({
//   '/api/users/:id': {
//     get: getUserById,
//   },
//   '/api/users': {
//     post: createUser,
//   },
// } as const);

// export const doc = dsl.openApi({
//   openapi: '3.1.0',
//   info: {
//     title: 'test',
//     version: '1.0.0',
//   },
//   paths,
//   components,
// } as const);
