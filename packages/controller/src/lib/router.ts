import {
  Document,
  HttpMethods,
  OperationObject,
  PathItemObject,
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
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { Option } from 'fp-ts/lib/Option';
import { Reader } from 'fp-ts/lib/Reader';
import { Task } from 'fp-ts/lib/Task';
import { ValidationError } from 'io-ts';
import { match, MatchResult } from 'path-to-regexp';
import { bodyParameterCodec, Decoder, pathParametersCodec } from './parameters';

import { HttpRequest, HttpResponse } from './api';
import { Controller } from './controller';

type HandleFn = (req: HttpRequest) => Task<HttpResponse>;
type Methods = (method: HttpMethods) => Option<HandleFn>;
type Route = (path: string) => Option<Methods>;

type Router = (
  path: string,
  method: HttpMethods
) => Either<HttpResponse, HandleFn>;

type CompilerInput = { doc: Document; controller: Controller<Document> };
type Compiler<F> = Reader<CompilerInput, F>;
type ControllerFn = (data: any) => Task<HttpResponse>;
type MatchFunction = (path: string) => Option<MatchResult>;

const rsp = (code: number, body: unknown): HttpResponse => ({ code, body });

const resolveRef: <Doc extends Document>(
  doc: Doc
) => <Ref extends string>(ref: Ref) => Option<ResolveRef<Doc, SplitRef<Ref>>> =
  <Doc extends Document>(doc: Doc) =>
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

type MethodTupleList<T> = readonly (readonly [HttpMethods, T])[];

const getImplementedMethods: (
  pathItem: PathItemObject
) => MethodTupleList<OperationObject> = (pathItem) =>
  pipe(
    Object.values(HttpMethods),
    array.filterMap((method) =>
      pipe(
        option.fromNullable(pathItem[method]),
        option.map((op) => [method, op] as const)
      )
    )
  );

const compilePathCodec: (operation: OperationObject) => Compiler<Decoder> =
  (operation) =>
  ({ doc }) =>
    pipe(
      pathParametersCodec(resolveRef(doc))(operation),
      either.getOrElseW((err) => {
        throw err;
      })
    );

const compileInBodyCodec: (operation: OperationObject) => Compiler<Decoder> =
  (operation) =>
  ({ doc }) =>
    pipe(
      bodyParameterCodec(resolveRef(doc))(operation),
      either.getOrElseW((err) => {
        throw err;
      })
    );

const buildResponseFromValidationErrors: (
  errors: ValidationError[]
) => Task<HttpResponse> = (errors) => task.of(rsp(400, errors));

type BuildOperationHandleFnInput = {
  pathDecoder: Decoder;
  inBodyDecoder: Decoder;
  controller: ControllerFn;
};

const buildOperationHandleFn: (
  input: BuildOperationHandleFnInput
) => (pathMatch: MatchResult) => HandleFn =
  ({ pathDecoder, inBodyDecoder, controller }) =>
  (pathMatch) =>
  (req) =>
    pipe(
      either.Do,
      either.bind('path', () => pathDecoder(pathMatch.params)),
      either.bind('inBody', () => inBodyDecoder(req.body)),
      either.mapLeft(buildResponseFromValidationErrors),
      either.map(({ path, inBody }) => controller({ ...path, ...inBody })),
      either.getOrElse(identity)
    );

const getControllerFnForOperation: (
  operation: OperationObject
) => Compiler<ControllerFn> = (operation) =>
  reader.asks(
    ({ controller }) =>
      controller[operation.operationId as keyof typeof controller]
  );

const compileOperationToHandleFn: (
  operation: OperationObject
) => Compiler<(pathMatch: MatchResult) => HandleFn> = (operation) =>
  pipe(
    reader.Do,
    reader.bind('pathDecoder', () => compilePathCodec(operation)),
    reader.bind('inBodyDecoder', () => compileInBodyCodec(operation)),
    reader.bind('controller', () => getControllerFnForOperation(operation)),
    reader.map(buildOperationHandleFn)
  );

const liftHandleTuplesToMethods: (
  tuples: MethodTupleList<(pathMatch: MatchResult) => HandleFn>
) => (pathMatch: MatchResult) => Methods =
  (tuples) => (pathMatch) => (method) =>
    pipe(
      tuples,
      readonlyArray.findFirstMap(([m, handle]) =>
        m === method ? option.some(handle) : option.none
      ),
      option.ap(option.some(pathMatch))
    );

const compilePathItemObjectToMethods: (
  pathItem: PathItemObject
) => Compiler<(pathMatch: MatchResult) => Methods> = flow(
  getImplementedMethods,
  reader.traverseArray(([method, op]) =>
    pipe(
      compileOperationToHandleFn(op),
      reader.map((h) => [method, h] as const)
    )
  ),
  reader.map(liftHandleTuplesToMethods)
);

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
      methods(method),
      either.fromOption(() => rsp(405, `Method ${method} not supported`))
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
