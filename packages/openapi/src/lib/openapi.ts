import { OpenAPIV3_1 as openapi, OpenAPIV3 } from 'openapi-types';

export type MediaTypeObject = openapi.MediaTypeObject;
export type ResponseObject = openapi.ResponseObject;
export type ReferenceObject = openapi.ReferenceObject;
export type ParameterObject = openapi.ParameterObject;
export type Document = openapi.Document;
export type PathsObject = openapi.PathsObject;
export type ComponentsObject = openapi.ComponentsObject;
export type SchemaObject = openapi.SchemaObject;
export type PathItemObject = openapi.PathItemObject;
export type HttpMethods = openapi.HttpMethods;
export const HttpMethods = OpenAPIV3.HttpMethods;

export type OperationObject = openapi.OperationObject & {
  operationId: NonNullable<openapi.OperationObject['operationId']>;
  responses: NonNullable<openapi.OperationObject['responses']>;
};
