import { DeepReadonly, ResolveRef, SplitRef } from '@oa-ts/common';
import {
  PathItemObject,
  Document,
  PathsObject,
  HttpMethods,
  OperationObject,
} from '@oa-ts/openapi';
import {
  array,
  either,
  option,
  readonlyNonEmptyArray,
  string,
  task,
} from 'fp-ts';
import { pipe } from 'fp-ts/lib/function';
import { Option } from 'fp-ts/lib/Option';
import { Task } from 'fp-ts/lib/Task';
import { match, MatchResult } from 'path-to-regexp';
import { pathParametersCodec, ToHandler } from './operation-object-to-handler';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
type PickAndFlatten<T, K extends keyof T = keyof T> = UnionToIntersection<T[K]>;

type PathsWithPrefixedMethods<Paths extends DeepReadonly<PathsObject>> = {
  [p in keyof Paths]: p extends string
    ? {
        [m in keyof Paths[p] as m extends string
          ? `${p}.${m}`
          : '']: Paths[p][m];
      }
    : never;
};

type FlattenedPaths<Doc extends DeepReadonly<Document>> =
  Doc['paths'] extends DeepReadonly<PathsObject>
    ? PickAndFlatten<PathsWithPrefixedMethods<Doc['paths']>>
    : never;

type ControllerFromFlattenedPaths<Doc, Operations> = PickAndFlatten<{
  [k in keyof Operations]: Operations[k] extends DeepReadonly<OperationObject>
    ? ToHandler<Operations[k], Doc>
    : 'dupa';
}>;

export type Controller<Doc extends DeepReadonly<Document>> =
  ControllerFromFlattenedPaths<Doc, FlattenedPaths<Doc>>;

type HttpRequest = {
  method: HttpMethods;
  path: string;
};
type HttpResponse = {
  code: number;
  body: string;
};

const matchPath: (req: HttpRequest) => (path: string) => Option<MatchResult> =
  (req) => (path) =>
    pipe(
      req.path,
      match(path, {
        decode: decodeURIComponent,
      }),
      option.fromPredicate((r): r is MatchResult => r !== false)
    );

const matchMethod: (
  req: HttpRequest
) => (
  pathItem: DeepReadonly<PathItemObject>
) => Option<DeepReadonly<OperationObject>> = (req) => (pathItem) =>
  option.fromNullable(pathItem[req.method]);

const resolveRef: <Doc extends DeepReadonly<Document>>(
  doc: Doc
) => <Ref extends string>(ref: Ref) => Option<ResolveRef<Doc, SplitRef<Ref>>> =
  <Doc extends DeepReadonly<Document>>(doc: Doc) =>
  <Ref extends string>(ref: Ref) =>
    pipe(
      string.split('/')(ref),
      readonlyNonEmptyArray.reduce<string, Option<any>>(
        option.some(doc),
        (oobj, key) =>
          key === '#'
            ? oobj
            : pipe(
                oobj,
                option.chain((obj) => option.fromNullable(obj[key]))
              )
      )
    );

const handle: <Doc extends DeepReadonly<Document>>(
  req: HttpRequest,
  doc: Doc
) => (
  controller: Controller<Doc>
) => (args: {
  operation: DeepReadonly<OperationObject>;
  pathMatch: MatchResult;
}) => Task<HttpResponse> = (_req, doc) => (controller) => (args) => {
  return pipe(
    pathParametersCodec(resolveRef(doc))(args.operation),
    either.chainW((c) => c.decode(args.pathMatch.params)),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    either.map(controller[args.operation.operationId ?? '']),
    either.getOrElse((err) => task.of({ code: 500, body: `${err}` }))
  );
};

export const router: <Doc extends DeepReadonly<Document>>(
  doc: Doc
) => (
  controller: Controller<Doc>
) => (req: HttpRequest) => Task<HttpResponse> =
  (doc) => (controller) => (req) => {
    return pipe(
      option.fromNullable(doc.paths),
      option.map((paths) => Object.entries(paths)),
      option.chain(
        array.findFirstMap(([path, pathItem]) =>
          pipe(
            path,
            matchPath(req),
            option.map((pathMatch) => ({ pathMatch, pathItem }))
          )
        )
      ),
      option.bind('operation', ({ pathItem }) =>
        pipe(pathItem, option.fromNullable, option.chain(matchMethod(req)))
      ),
      option.traverse(task.ApplicativeSeq)(handle(req, doc)(controller)),
      task.map(option.getOrElse(() => ({ code: 404, body: 'not found' })))
    );
  };
