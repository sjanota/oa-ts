import { io } from '@oa-ts/common';
import { isRef, OperationObject, ParameterObject } from '@oa-ts/openapi';
import { schemaObjectToCodec } from '@oa-ts/schema';
import { either, option, readonlyArray } from 'fp-ts';
import { Either } from 'fp-ts/lib/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import { Option } from 'fp-ts/lib/Option';
import { ValidationError } from 'io-ts';

export type Decoder<T = any> = (x: unknown) => Either<ValidationError[], T>;

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
    either.map(readonlyArray.filter((p) => p.in === 'path')),
    either.chain(either.traverseArray(parameterToCodec(resolveRef, true))),
    either.map(flow(Object.fromEntries, io.partial)),
    either.map((c) => c.decode)
  );

export const pathParametersCodec: (
  resolveRef: (ref: string) => Option<ParameterObject>
) => (operation: OperationObject) => Either<Error, Decoder> =
  (resolveRef) => (o) =>
    pipe(
      o.parameters,
      option.fromNullable,
      option.map(pathParametersToCodec(resolveRef)),
      option.getOrElse(() => either.right(io.unknown.decode))
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
