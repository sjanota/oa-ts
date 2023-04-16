import { OpenAPIV3_1 as openapi, OpenAPIV3 } from 'openapi-types';

type DeepReadonly<T> = T extends Array<infer I>
  ? ReadonlyArray<DeepReadonly<I>>
  : T extends object
  ? Readonly<{ [k in keyof T]: DeepReadonly<T[k]> }>
  : T;

// eslint-disable-next-line @typescript-eslint/ban-types
type NonNull = {};

export type HttpMethods = openapi.HttpMethods;
export const HttpMethods = OpenAPIV3.HttpMethods;

export type MediaTypeObject = DeepReadonly<
  Omit<openapi.MediaTypeObject, 'schema'> & {
    schema: NonNullable<openapi.MediaTypeObject['schema']>;
  }
>;
export type ResponseObject = DeepReadonly<openapi.ResponseObject>;
export type ReferenceObject = DeepReadonly<openapi.ReferenceObject>;
export type ParameterObject = DeepReadonly<
  Omit<openapi.ParameterObject, 'schema'> & {
    schema: ReferenceObject | SchemaObject;
  }
>;

export type ComponentsObject = DeepReadonly<openapi.ComponentsObject>;
export type SchemaObject = DeepReadonly<openapi.SchemaObject>;
export type ArraySchemaObject = DeepReadonly<openapi.ArraySchemaObject>;

export type OperationObject<T extends NonNull = NonNull> = DeepReadonly<
  Omit<
    openapi.OperationObject<T>,
    'operationId' | 'responses' | 'parameters'
  > & {
    operationId: NonNullable<openapi.OperationObject['operationId']>;
    responses: Record<number, ReferenceObject | ResponseObject>;
    parameters?: (ReferenceObject | ParameterObject)[];
  }
>;

export type PathItemObject<T extends NonNull = NonNull> = DeepReadonly<
  Omit<openapi.PathItemObject<T>, HttpMethods | 'parameters'> & {
    parameters?: (ReferenceObject | ParameterObject)[];
  } & {
    [method in HttpMethods]?: OperationObject<T>;
  }
>;

export type PathsObject<
  T extends NonNull = NonNull,
  P extends NonNull = NonNull
> = DeepReadonly<Record<string, PathItemObject<T> & P>>;

export type Document<T extends NonNull = NonNull> = DeepReadonly<
  Omit<openapi.Document<T>, 'paths'> & {
    paths: PathsObject;
  }
>;
