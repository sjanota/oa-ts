import { DeepReadonly, openapi } from '@oa-ts/common';
import { array, option, task } from 'fp-ts';
import { pipe } from 'fp-ts/lib/function';
import { Option } from 'fp-ts/lib/Option';
import { Task } from 'fp-ts/lib/Task';
import { match } from 'path-to-regexp';
import { OperationObject, ToHandler } from './operation-object-to-handler';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type PickAndFlatten<T, K extends keyof T = keyof T> = UnionToIntersection<T[K]>;

type PathsWithPrefixedMethods<Paths extends DeepReadonly<openapi.PathsObject>> =
  {
    [p in keyof Paths]: p extends string
      ? {
          [m in keyof Paths[p] as m extends string
            ? `${p}.${m}`
            : '']: Paths[p][m];
        }
      : never;
  };

type FlattenedPaths<Doc extends DeepReadonly<openapi.Document>> =
  Doc['paths'] extends DeepReadonly<openapi.PathsObject>
    ? PickAndFlatten<PathsWithPrefixedMethods<Doc['paths']>>
    : never;

type ControllerFromFlattenedPaths<Doc, Operations> = PickAndFlatten<{
  [k in keyof Operations]: Operations[k] extends DeepReadonly<OperationObject>
    ? ToHandler<Operations[k], Doc>
    : 'dupa';
}>;

export type Controller<Doc extends DeepReadonly<openapi.Document>> =
  ControllerFromFlattenedPaths<Doc, FlattenedPaths<Doc>>;

type HttpRequest = {
  method: openapi.HttpMethods;
  path: string;
};
type HttpResponse = {
  code: number;
};

const matchPath: (req: HttpRequest) => (path: string) => boolean =
  (req) => (path) =>
    !!match(path, {
      decode: decodeURIComponent,
    })(req.path);

const matchMethod: (
  req: HttpRequest
) => (
  pathItem: DeepReadonly<openapi.PathItemObject>
) => Option<DeepReadonly<openapi.OperationObject>> = (req) => (pathItem) =>
  option.fromNullable(pathItem[req.method]);

declare const handle: (
  req: HttpRequest
) => <Doc extends DeepReadonly<openapi.Document>>(
  controller: Controller<Doc>
) => (operation: DeepReadonly<openapi.OperationObject>) => Task<HttpResponse>;

export const router: <Doc extends DeepReadonly<openapi.Document>>(
  doc: Doc
) => (
  controller: Controller<Doc>
) => (req: HttpRequest) => Task<HttpResponse> =
  (doc) => (controller) => (req) => {
    return pipe(
      option.fromNullable(doc.paths),
      option.map((paths) => Object.entries(paths)),
      option.chain(array.findFirst(([path, _]) => matchPath(req)(path))),
      option.chain(([_, pathItem]) =>
        pipe(pathItem, option.fromNullable, option.chain(matchMethod(req)))
      ),
      option.traverse(task.ApplicativeSeq)(handle(req)(controller)),
      task.map(option.getOrElse(() => ({ code: 404 })))
    );
  };
