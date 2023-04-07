import { DeepReadonly, io, openapi } from './common';
import { HandlerFn, HandlerResponse } from './handler';
import { SchemaObjectToCodec } from './schema-object-io-ts';

type OperationObject = openapi.OperationObject & {
  operationId: NonNullable<openapi.OperationObject['operationId']>;
  responses: NonNullable<openapi.OperationObject['responses']>;
};

type ToSchema<Schema> = Schema extends openapi.SchemaObject
  ? io.TypeOf<SchemaObjectToCodec<Schema>>
  : 'expected SchemaObject';

type ToHandlerResponseSchema<Schema> = Schema extends openapi.MediaTypeObject
  ? ToSchema<Schema['schema']>
  : 'expected MediaTypeObject';

type ToHandlerResponse<Code, Rsp> = Rsp extends openapi.ResponseObject
  ? {
      [k in keyof Rsp['content']]: HandlerResponse<
        Code,
        ToHandlerResponseSchema<Rsp['content'][k]>
      >;
    }[keyof Rsp['content']]
  : never;

type ToHandlerResponses<Path extends DeepReadonly<OperationObject>> = {
  [k in keyof Path['responses']]: ToHandlerResponse<k, Path['responses'][k]>;
}[keyof Path['responses']];

type ToHandlerArgSchema<T> = T extends openapi.ParameterObject
  ? ToSchema<T['schema']>
  : 'expected ParameterObject';

type ToHandlerArgName<T> = T extends openapi.ParameterObject
  ? T['name']
  : never;

type ToHandlerArgs<Path extends DeepReadonly<OperationObject>> = [
  Path['parameters']
] extends [undefined]
  ? Record<string, never>
  : {
      [k in keyof Path['parameters'] as ToHandlerArgName<
        Path['parameters'][k]
      >]: ToHandlerArgSchema<Path['parameters'][k]>;
    };

type ToHandlerFn<Path extends DeepReadonly<OperationObject>> = HandlerFn<
  ToHandlerArgs<Path>,
  ToHandlerResponses<Path>
>;

export type ToHandler<Path extends DeepReadonly<OperationObject>> = Record<
  Path['operationId'],
  ToHandlerFn<Path>
>;
