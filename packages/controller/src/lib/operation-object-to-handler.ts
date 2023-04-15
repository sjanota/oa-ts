import { io } from '@oa-ts/common';
import {
  isRef,
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
import { ValidationError } from 'io-ts';
import { HandlerFn, HandlerResponse } from './handler';

type Decoder = (x: unknown) => Either<ValidationError[], any>;

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

const parameterToCodec: (
  resolveRef: (ref: string) => Option<any>,
  fromString: boolean
) => (param: ParameterObject) => Either<Error, readonly [string, io.Any]> =
  (resolveRef, fromString) => (param) =>
    pipe(
      param.schema,
      either.fromNullable(new Error()),
      either.chain((schema) =>
        schemaObjectToCodec(schema, resolveRef, fromString)
      ),
      either.map((codec) => [param.name, codec] as const)
    );

const pathParametersToCodec: (
  resolveRef: (ref: string) => Option<any>
) => (
  params: NonNullable<OperationObject['parameters']>
) => Either<Error, io.Any> = (resolveRef) => (params) =>
  pipe(
    params,
    either.traverseArray((p) =>
      isRef(p)
        ? pipe(
            resolveRef(p.$ref),
            either.fromOption(() => new Error(`cannot resolve ref ${p.$ref}`))
          )
        : either.right(p)
    ),
    either.map(readonlyArray.filter((p) => p.in === 'path')),
    either.chain(either.traverseArray(parameterToCodec(resolveRef, true))),
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

const bodyParameterToCodec: (
  resolveRef: (ref: string) => Option<any>
) => (
  params: NonNullable<OperationObject['parameters']>
) => Either<Error, Decoder> = (resolveRef) => (params) =>
  pipe(
    params,
    either.traverseArray((p) =>
      isRef(p)
        ? pipe(
            resolveRef(p.$ref),
            either.fromOption(() => new Error(`cannot resolve ref ${p.$ref}`))
          )
        : either.right(p)
    ),
    either.map(readonlyArray.findFirst((p) => p.in === 'body')),
    either.chain(
      option.traverse(either.Applicative)(parameterToCodec(resolveRef, false))
    ),
    either.map(
      flow(
        option.map(([name, codec]) =>
          flow(
            codec.decode,
            either.map((a) => ({ [name]: a }))
          )
        ),
        option.getOrElse(() => io.undefined.decode as Decoder)
      )
    )
  );

export const bodyParameterCodec: (
  resolveRef: (ref: string) => Option<ParameterObject>
) => (operation: OperationObject) => Either<Error, Decoder> =
  (resolveRef) => (o) =>
    pipe(
      o.parameters,
      option.fromNullable,
      option.map(bodyParameterToCodec(resolveRef)),
      option.getOrElse(() => either.right(io.unknown.decode))
    );
