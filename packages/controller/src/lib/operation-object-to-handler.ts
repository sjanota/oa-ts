import { DeepReadonly, io, openapi, ResolveReference } from '@oa-ts/common';
import {
  schemaObjectToCodec,
  SchemaOrReference,
  SchemaToCodec,
} from '@oa-ts/schema';
import { array, either, option } from 'fp-ts';
import { Either } from 'fp-ts/lib/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import { HandlerFn, HandlerResponse } from './handler';

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

const isParameter = (
  x: openapi.ParameterObject | openapi.ReferenceObject
): x is openapi.ParameterObject =>
  !Object.prototype.hasOwnProperty.call(x, '$ref');

const parameterToCodec: (
  param: openapi.ParameterObject
) => Either<Error, readonly [string, io.Any]> = (param) =>
  pipe(
    param.schema,
    either.fromNullable(new Error()),
    either.chain((schema) => schemaObjectToCodec(schema)),
    either.map((codec) => [param.name, codec] as const)
  );

const pathParametersToCodec: (
  params: (openapi.ParameterObject | openapi.ReferenceObject)[]
) => Either<Error, io.Any> = (params) =>
  pipe(
    params,
    array.filter(isParameter),
    array.filter((p) => p.in === 'path'),
    either.traverseArray(parameterToCodec),
    either.map(flow(Object.fromEntries, io.partial))
  );

export const pathParametersCodec: (
  operation: openapi.OperationObject
) => Either<Error, io.Any> = (o) =>
  pipe(
    o.parameters,
    option.fromNullable,
    option.map(pathParametersToCodec),
    option.getOrElse(() => either.right(io.unknown as io.Any))
  );
