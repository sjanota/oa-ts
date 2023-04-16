import { HttpMethods } from '@oa-ts/openapi';
import { Task } from 'fp-ts/lib/Task';

export type HandlerResponse<Code, Schema> = {
  code: Code;
  body: Schema;
};

export type HandlerResponses<Responses extends HandlerResponse<any, any>> =
  Task<Responses>;

export type HandlerArgs = Record<string, unknown>;

export type HandlerFn<
  Args extends HandlerArgs,
  Responses extends HandlerResponse<any, any>
> = (args: Args) => HandlerResponses<Responses>;

export type Handler<
  Name extends string,
  Args extends HandlerArgs,
  Responses extends HandlerResponse<any, any>
> = { [k in Name]: HandlerFn<Args, Responses> };

export type HttpRequest = {
  method: HttpMethods;
  path: string;
  body?: unknown;
};

export type HttpResponse = {
  code: number;
  body: unknown;
};
