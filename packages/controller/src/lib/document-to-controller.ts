import { log, PickAndFlatten } from '@oa-ts/common';
import {
  Document,
  HttpMethods,
  OperationObject,
  PathItemObject,
  PathsObject,
  ResolveRef,
  SplitRef,
} from '@oa-ts/openapi';
import {
  array,
  either,
  option,
  reader,
  readonlyArray,
  readonlyNonEmptyArray,
  string,
  task,
} from 'fp-ts';
import { Either } from 'fp-ts/lib/Either';
import { pipe, flow, identity } from 'fp-ts/lib/function';
import { Option } from 'fp-ts/lib/Option';
import { Reader } from 'fp-ts/lib/Reader';
import { Task } from 'fp-ts/lib/Task';
import { Match, match, MatchResult } from 'path-to-regexp';
import {
  bodyParameterCodec,
  pathParametersCodec,
  ToHandler,
} from './operation-object-to-handler';

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

type HttpRequest = {
  method: HttpMethods;
  path: string;
  body?: unknown;
};

type HttpResponse = {
  code: number;
  body: unknown;
};

const rsp = (code: number, body: unknown): HttpResponse => ({ code, body });

type HandleFn = (req: HttpRequest) => Task<HttpResponse>;

// const matchPath: (req: HttpRequest) => (path: string) => Option<MatchResult> =
//   (req) => (path) =>
//     pipe(
//       req.path,
// match(path, {
//   decode: decodeURIComponent,
// }),
//       option.fromPredicate((r): r is MatchResult => r !== false)
//     );

// const matchMethod: (
//   req: HttpRequest
// ) => (pathItem: PathItemObject) => Option<OperationObject> =
//   (req) => (pathItem) =>
//     option.fromNullable(pathItem[req.method]);

// const resolveRef: <Doc extends Document>(
//   doc: Doc
// ) => <Ref extends string>(ref: Ref) => Option<ResolveRef<Doc, SplitRef<Ref>>> =
//   <Doc extends Document>(doc: Doc) =>
//   <Ref extends string>(ref: Ref) =>
//     pipe(
//       string.split('/')(ref),
//       readonlyNonEmptyArray.reduce<string, Option<any>>(
//         option.some(doc),
//         (oobj, key) =>
//           key === '#'
//             ? oobj
//             : pipe(
//                 oobj,
//                 option.chain((obj) => option.fromNullable(obj[key]))
//               )
//       )
//     );

// const handle: <Doc extends Document>(
//   req: HttpRequest,
//   doc: Doc
// ) => (
//   controller: Controller<Doc>
// ) => (args: {
//   operation: OperationObject;
//   pathMatch: MatchResult;
// }) => Task<HttpResponse> = (req, doc) => (controller) => (args) =>
//   pipe(
//     either.Do,
//     either.bind('path', () =>
//       pipe(
//         pathParametersCodec(resolveRef(doc))(args.operation),
//         either.chainW((c) => c.decode(args.pathMatch.params))
//       )
//     ),
//     either.bind('body', () =>
//       pipe(
//         bodyParameterCodec(resolveRef(doc))(args.operation),
//         either.chainW((c) => c(req.body))
//       )
//     ),
//     either.map(({ path, body }) =>
//       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//       // @ts-ignore
//       controller[args.operation.operationId ?? '']({ ...path, ...body })
//     ),
//     either.mapLeft(flow(JSON.stringify, log('handler error'))),
//     either.getOrElse((err) => task.of({ code: 500, body: `${err}` }))
//   );

type Methods = Partial<Record<HttpMethods, HandleFn>>;
type Route = (path: string) => Option<Methods>;

type Router = (
  path: string,
  method: HttpMethods
) => Either<HttpResponse, HandleFn>;

type CompilerInput = { doc: Document; controller: Controller<Document> };
type Compiler<F> = Reader<CompilerInput, F>;

// export const router2: <Doc extends Document>(
//   doc: Doc
// ) => (
//   controller: Controller<Doc>
// ) => (req: HttpRequest) => Task<HttpResponse> =
//   (doc) => (controller) => (req) => {
//     return pipe(
//       option.fromNullable(doc.paths),
//       option.map((paths) => Object.entries(paths)),
//       option.chain(
//         array.findFirstMap(([path, pathItem]) =>
//           pipe(
//             path,
//             getMatchingRoute(req),
//             option.map((pathMatch) => ({ pathMatch, pathItem }))
//           )
//         )
//       ),
//       option.bind('operation', ({ pathItem }) =>
//         pipe(
//           pathItem,
//           option.fromNullable,
//           option.chain(getMatchingHandle(req))
//         )
//       ),
//       option.traverse(task.ApplicativeSeq)(handle(req, doc)(controller)),
//       task.map(option.getOrElse(() => ({ code: 404, body: 'not found' })))
//     );
//   };

type MatchFunction = (path: string) => Option<MatchResult>;

declare const compilePathItemObjectToMethods: (
  pathItem: PathItemObject
) => Compiler<(pathMatch: MatchResult) => Methods>;

const compileMatchFn: (pathPattern: string) => MatchFunction = (pathPattern) =>
  flow(
    match(pathPattern, {
      decode: decodeURIComponent,
    }),
    option.fromPredicate((x): x is MatchResult => x !== false)
  );

const compilePathEntryToRoute: ([pathPattern, pathItem]: [
  string,
  PathItemObject
]) => Compiler<Route> = ([pathPattern, pathItem]) =>
  pipe(
    reader.Do,
    reader.bind('matchFn', () => () => compileMatchFn(pathPattern)),
    reader.bind('methodsFn', () => compilePathItemObjectToMethods(pathItem)),
    reader.map(({ matchFn, methodsFn }) => flow(matchFn, option.map(methodsFn)))
  );

const compileRoutes: Compiler<readonly Route[]> = pipe(
  reader.asks(({ doc }: CompilerInput) => pipe(doc.paths, Object.entries)),
  reader.chain(reader.traverseArray(compilePathEntryToRoute))
);

const getMatchingRoute: (
  path: string
) => (routes: readonly Route[]) => Either<HttpResponse, Methods> = (path) =>
  flow(
    readonlyArray.findFirstMap((route) => route(path)),
    either.fromOption(() => rsp(404, `Path ${path} not found`))
  );

const getMatchingHandle: (
  method: HttpMethods
) => (methods: Methods) => Either<HttpResponse, HandleFn> =
  (method) => (methods) =>
    pipe(
      methods[method],
      either.fromNullable(rsp(405, `Method ${method} not supported`))
    );

const pickRoute: (routes: readonly Route[]) => Router =
  (routes) => (path, method) =>
    pipe(
      routes,
      getMatchingRoute(path),
      either.chain(getMatchingHandle(method))
    );

const compileRouter: Compiler<Router> = flow(compileRoutes, pickRoute);

const handle: (router: Router) => HandleFn = (router) => (req) =>
  pipe(
    router(req.path, req.method),
    either.ap(either.right(req)),
    either.getOrElse(task.of)
  );

export const router: <Doc extends Document>(
  doc: Doc,
  controller: Controller<Doc>
) => HandleFn = (doc, controller) =>
  pipe(compileRouter({ doc, controller }), handle);
