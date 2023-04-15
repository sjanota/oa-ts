import { DeepReadonly, io, ResolveReference } from '@oa-ts/common';
import {
  MediaTypeObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
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

type ToSchema<
  Doc,
  Schema extends DeepReadonly<SchemaOrReference> | undefined
> = Schema extends Record<string, any>
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
  Parameter extends DeepReadonly<ParameterObject>
    ? ToSchema<Doc, Parameter['schema']>
    : Parameter extends DeepReadonly<ReferenceObject>
    ? ToHandlerArgSchema<Doc, ResolveReference<Doc, Parameter>>
    : never;

type ToHandlerArgName<Doc, Parameter> =
  Parameter extends DeepReadonly<ParameterObject>
    ? Parameter['name']
    : Parameter extends DeepReadonly<ReferenceObject>
    ? ToHandlerArgName<Doc, ResolveReference<Doc, Parameter>>
    : never;

type ToHandlerArgs<Doc, Operation extends DeepReadonly<OperationObject>> = {
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
  x: DeepReadonly<ParameterObject> | DeepReadonly<ReferenceObject>
): x is DeepReadonly<ParameterObject> =>
  !Object.prototype.hasOwnProperty.call(x, '$ref');

const parameterToCodec: (
  resolveRef: (ref: string) => Option<any>
) => (
  param: DeepReadonly<ParameterObject>
) => Either<Error, readonly [string, io.Any]> = (resolveRef) => (param) =>
  pipe(
    param.schema,
    either.fromNullable(new Error()),
    either.chain((schema) => schemaObjectToCodec(schema, resolveRef, true)),
    either.map((codec) => [param.name, codec] as const)
  );

const pathParametersToCodec: (
  resolveRef: (ref: string) => Option<any>
) => (
  params: readonly (
    | DeepReadonly<ParameterObject>
    | DeepReadonly<ReferenceObject>
  )[]
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
) => (operation: DeepReadonly<OperationObject>) => Either<Error, io.Any> =
  (resolveRef) => (o) =>
    pipe(
      o.parameters,
      option.fromNullable,
      option.map(pathParametersToCodec(resolveRef)),
      option.getOrElse(() => either.right(io.unknown as io.Any))
    );
