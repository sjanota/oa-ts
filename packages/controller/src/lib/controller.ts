import { io, PickAndFlatten } from '@oa-ts/common';
import {
  PathsObject,
  OperationObject,
  Document,
  ParameterObject,
  ReferenceObject,
  ResolveReference,
  MediaTypeObject,
  ResponseObject,
} from '@oa-ts/openapi';
import { SchemaOrReference, SchemaToCodec } from '@oa-ts/schema';
import { HandlerFn, HandlerResponse } from './api';

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

type ToHandler<
  Operation extends OperationObject,
  Doc = Record<string, never>
> = Record<Operation['operationId'], ToHandlerFn<Doc, Operation>>;

export type PathsWithPrefixedMethods<Paths extends PathsObject> = {
  [p in keyof Paths]: p extends string
    ? {
        [m in keyof Paths[p] as m extends string
          ? `${p}.${m}`
          : '']: Paths[p][m];
      }
    : never;
};

export type FlattenedPaths<Doc extends Document> = PickAndFlatten<
  PathsWithPrefixedMethods<Doc['paths']>
>;

type ControllerFromFlattenedPaths<Doc, Operations> = PickAndFlatten<{
  [k in keyof Operations]: Operations[k] extends OperationObject
    ? ToHandler<Operations[k], Doc>
    : never;
}>;

export type Controller<Doc extends Document> = ControllerFromFlattenedPaths<
  Doc,
  FlattenedPaths<Doc>
>;
