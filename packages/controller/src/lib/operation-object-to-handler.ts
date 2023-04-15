import { io } from '@oa-ts/common';
import {
  MediaTypeObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  ResolveReference,
  ResponseObject,
} from '@oa-ts/openapi';
import {
  schemaObjectToCodec,
  SchemaOrReference,
  SchemaToCodec,
} from '@oa-ts/schema';
import { either, option, readonlyArray } from 'fp-ts';
import { Either } from 'fp-ts/lib/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import { Option } from 'fp-ts/lib/Option';
import { HandlerFn, HandlerResponse } from './handler';

type ToSchema<Doc, Schema extends SchemaOrReference> = Schema extends Record<
  string,
  any
>
  ? io.TypeOf<SchemaToCodec<Schema, Doc>>
  : never;

type ToHandlerResponseSchema<Doc, Schema> = Schema extends MediaTypeObject
  ? ToSchema<Doc, Schema['schema']>
  : 'expected MediaTypeObject';

type ToHandlerResponse<Doc, Code, Rsp extends ResponseObject> = {
  [k in keyof Rsp['content']]: HandlerResponse<
    Code,
    ToHandlerResponseSchema<Doc, Rsp['content'][k]>
  >;
}[keyof Rsp['content']];

type ToHandlerResponsesSingle<Doc, Code, Response> =
  Response extends ResponseObject
    ? ToHandlerResponse<Doc, Code, Response>
    : Response extends ReferenceObject
    ? ToHandlerResponsesSingle<Doc, Code, ResolveReference<Doc, Response>>
    : never;

type ToHandlerResponses<Doc, Operation extends OperationObject> = {
  [k in keyof Operation['responses']]: ToHandlerResponsesSingle<
    Doc,
    k,
    Operation['responses'][k]
  >;
}[keyof Operation['responses']];

type ToHandlerArgSchema<Doc, Parameter> = Parameter extends ParameterObject
  ? ToSchema<Doc, Parameter['schema']>
  : Parameter extends ReferenceObject
  ? ToHandlerArgSchema<Doc, ResolveReference<Doc, Parameter>>
  : never;

type ToHandlerArgName<Doc, Parameter> = Parameter extends ParameterObject
  ? Parameter['name']
  : Parameter extends ReferenceObject
  ? ToHandlerArgName<Doc, ResolveReference<Doc, Parameter>>
  : never;

type ToHandlerArgs<Doc, Operation extends OperationObject> = {
  [k in keyof Operation['parameters'] as ToHandlerArgName<
    Doc,
    Operation['parameters'][k]
  >]-?: ToHandlerArgSchema<Doc, Operation['parameters'][k]>;
};

type ToHandlerFn<Doc, Operation extends OperationObject> = HandlerFn<
  ToHandlerArgs<Doc, Operation>,
  ToHandlerResponses<Doc, Operation>
>;

export type ToHandler<
  Operation extends OperationObject,
  Doc = Record<string, never>
> = Record<Operation['operationId'], ToHandlerFn<Doc, Operation>>;

const isParameter = (
  x: ParameterObject | ReferenceObject
): x is ParameterObject => !Object.prototype.hasOwnProperty.call(x, '$ref');

const parameterToCodec: (
  resolveRef: (ref: string) => Option<any>
) => (param: ParameterObject) => Either<Error, readonly [string, io.Any]> =
  (resolveRef) => (param) =>
    pipe(
      param.schema,
      either.fromNullable(new Error()),
      either.chain((schema) => schemaObjectToCodec(schema, resolveRef, true)),
      either.map((codec) => [param.name, codec] as const)
    );

const pathParametersToCodec: (
  resolveRef: (ref: string) => Option<any>
) => (
  params: readonly (ParameterObject | ReferenceObject)[]
) => Either<Error, io.Any> = (resolveRef) => (params) =>
  pipe(
    params,
    either.traverseArray((p) =>
      isParameter(p)
        ? either.right(p)
        : pipe(
            resolveRef(p.$ref),
            either.fromOption(() => new Error(`cannot resolve ref ${p.$ref}`))
          )
    ),
    either.map(readonlyArray.filter((p) => p.in === 'path')),
    either.chain(either.traverseArray(parameterToCodec(resolveRef))),
    either.map(flow(Object.fromEntries, io.partial))
  );

export const pathParametersCodec: (
  resolveRef: (ref: string) => Option<ParameterObject>
) => (operation: OperationObject) => Either<Error, io.Any> =
  (resolveRef) => (o) =>
    pipe(
      o.parameters,
      option.fromNullable,
      option.map(pathParametersToCodec(resolveRef)),
      option.getOrElse(() => either.right(io.unknown as io.Any))
    );
