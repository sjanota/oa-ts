import { DeepReadonly } from '@oa-ts/common';
import { OpenAPIV3_1 as openapi, OpenAPIV3 } from 'openapi-types';

// eslint-disable-next-line @typescript-eslint/ban-types
type NonNull = {};

export type HttpMethods = openapi.HttpMethods;
export const HttpMethods = OpenAPIV3.HttpMethods;

export type MediaTypeObject = openapi.MediaTypeObject;
export type ResponseObject = openapi.ResponseObject;
export type ReferenceObject = openapi.ReferenceObject;
export type ParameterObject = openapi.ParameterObject;

export type ComponentsObject = openapi.ComponentsObject;
export type SchemaObject = openapi.SchemaObject;

export type OperationObject<T extends NonNull = NonNull> =
  openapi.OperationObject<T> & {
    operationId: NonNullable<openapi.OperationObject['operationId']>;
    responses: NonNullable<openapi.OperationObject['responses']>;
  };

export type PathItemObject<T extends NonNull = NonNull> =
  openapi.PathItemObject<T> & {
    [method in HttpMethods]?: OperationObject<T>;
  };

export type PathsObject<
  T extends NonNull = NonNull,
  P extends NonNull = NonNull
> = Record<string, PathItemObject<T> & P>;

export type Document<T extends NonNull = NonNull> = DeepReadonly<
  openapi.Document<T> & {
    paths: PathsObject;
  }
>;
