import { DeepReadonly, io, openapi, ResolveReference } from './common';
import { HandlerFn, HandlerResponse } from './handler';
import { SchemaOrReference, SchemaToCodec } from './schema-object-io-ts';

export type OperationObject = openapi.OperationObject & {
  operationId: NonNullable<openapi.OperationObject['operationId']>;
  responses: NonNullable<openapi.OperationObject['responses']>;
};

type ToSchema<
  Doc,
  Schema extends DeepReadonly<SchemaOrReference> | undefined
> = Schema extends Record<string, any>
  ? io.TypeOf<SchemaToCodec<Schema, Doc>>
  : never;

type ToHandlerResponseSchema<Doc, Schema> =
  Schema extends openapi.MediaTypeObject
    ? ToSchema<Doc, Schema['schema']>
    : 'expected MediaTypeObject';

type ToHandlerResponse<Doc, Code, Rsp extends openapi.ResponseObject> = {
  [k in keyof Rsp['content']]: HandlerResponse<
    Code,
    ToHandlerResponseSchema<Doc, Rsp['content'][k]>
  >;
}[keyof Rsp['content']];

type ToHandlerResponsesSingle<Doc, Code, Response> =
  Response extends openapi.ResponseObject
    ? ToHandlerResponse<Doc, Code, Response>
    : Response extends openapi.ReferenceObject
    ? ToHandlerResponsesSingle<Doc, Code, ResolveReference<Doc, Response>>
    : never;

type ToHandlerResponses<
  Doc,
  Operation extends DeepReadonly<OperationObject>
> = {
  [k in keyof Operation['responses']]: ToHandlerResponsesSingle<
    Doc,
    k,
    Operation['responses'][k]
  >;
}[keyof Operation['responses']];

type ToHandlerArgSchema<Doc, Parameter> =
  Parameter extends DeepReadonly<openapi.ParameterObject>
    ? ToSchema<Doc, Parameter['schema']>
    : Parameter extends DeepReadonly<openapi.ReferenceObject>
    ? ToHandlerArgSchema<Doc, ResolveReference<Doc, Parameter>>
    : never;

type ToHandlerArgName<Doc, Parameter> =
  Parameter extends DeepReadonly<openapi.ParameterObject>
    ? Parameter['name']
    : Parameter extends DeepReadonly<openapi.ReferenceObject>
    ? ToHandlerArgName<Doc, ResolveReference<Doc, Parameter>>
    : never;

type ToHandlerArgs<
  Doc,
  Operation extends DeepReadonly<openapi.OperationObject>
> = {
  [k in keyof Operation['parameters'] as ToHandlerArgName<
    Doc,
    Operation['parameters'][k]
  >]-?: ToHandlerArgSchema<Doc, Operation['parameters'][k]>;
};

type ToHandlerFn<
  Doc,
  Operation extends DeepReadonly<OperationObject>
> = HandlerFn<
  ToHandlerArgs<Doc, Operation>,
  ToHandlerResponses<Doc, Operation>
>;

export type ToHandler<
  Operation extends DeepReadonly<OperationObject>,
  Doc = Record<string, never>
> = Record<Operation['operationId'], ToHandlerFn<Doc, Operation>>;
