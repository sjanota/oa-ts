export const api = {
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
