import { DeepReadonly, io, openapi } from './common';
import { HandlerFn, HandlerResponse } from './handler';
import { SchemaObjectToCodec } from './schema-object-io-ts';

export type OperationObject = openapi.OperationObject & {
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

type ToHandlerResponses<Operation extends DeepReadonly<OperationObject>> = {
  [k in keyof Operation['responses']]: ToHandlerResponse<
    k,
    Operation['responses'][k]
  >;
}[keyof Operation['responses']];

type ToHandlerArgSchema<Parameter> = Parameter extends openapi.ParameterObject
  ? ToSchema<Parameter['schema']>
  : 'expected ParameterObject';

type ToHandlerArgName<Parameter> = Parameter extends openapi.ParameterObject
  ? Parameter['name']
  : never;

type ToHandlerArgs<Operation extends DeepReadonly<OperationObject>> = {
  [k in keyof Operation['parameters'] as ToHandlerArgName<
    Operation['parameters'][k]
  >]: ToHandlerArgSchema<Operation['parameters'][k]>;
};

type ToHandlerFn<Operation extends DeepReadonly<OperationObject>> = HandlerFn<
  ToHandlerArgs<Operation>,
  ToHandlerResponses<Operation>
>;

export type ToHandler<Operation extends DeepReadonly<OperationObject>> = Record<
  Operation['operationId'],
  ToHandlerFn<Operation>
>;
