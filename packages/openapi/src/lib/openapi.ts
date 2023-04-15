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

export type MediaTypeObject = DeepReadonly<openapi.MediaTypeObject> & {
  schema: NonNullable<openapi.MediaTypeObject['schema']>;
};
export type ResponseObject = DeepReadonly<openapi.ResponseObject>;
export type ReferenceObject = DeepReadonly<openapi.ReferenceObject>;
export type ParameterObject = DeepReadonly<openapi.ParameterObject> & {
  schema: NonNullable<openapi.ParameterObject['schema']>;
};

export type ComponentsObject = DeepReadonly<openapi.ComponentsObject>;
export type SchemaObject = DeepReadonly<openapi.SchemaObject>;
export type ArraySchemaObject = DeepReadonly<openapi.ArraySchemaObject>;

export type OperationObject<T extends NonNull = NonNull> = DeepReadonly<
  openapi.OperationObject<T> & {
    operationId: NonNullable<openapi.OperationObject['operationId']>;
    responses: NonNullable<openapi.OperationObject['responses']>;
  }
>;

export type PathItemObject<T extends NonNull = NonNull> = DeepReadonly<
  openapi.PathItemObject<T> & {
    [method in HttpMethods]?: OperationObject<T>;
  }
>;

export type PathsObject<
  T extends NonNull = NonNull,
  P extends NonNull = NonNull
> = DeepReadonly<Record<string, PathItemObject<T> & P>>;

export type Document<T extends NonNull = NonNull> = DeepReadonly<
  openapi.Document<T> & {
    paths: PathsObject;
  }
>;
