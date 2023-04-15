import { identity } from 'fp-ts/lib/function';
import { DeepReadonly } from '@oa-ts/common';
import {
  OperationObject,
  PathsObject,
  ComponentsObject,
  SchemaObject,
  Document,
} from '@oa-ts/openapi';

export const operation: <
  Id extends string,
  O extends Omit<DeepReadonly<OperationObject>, 'operationId'>
>(
  operationId: Id,
  o: O
) => O & { operationId: Id } = (operationId, o) => ({ ...o, operationId });

export const openApi: <D extends DeepReadonly<Document>>(o: D) => D = identity;

export const paths: <P extends DeepReadonly<PathsObject>>(p: P) => P = identity;

export const components: <P extends DeepReadonly<ComponentsObject>>(p: P) => P =
  identity;

export const schema: <S extends DeepReadonly<SchemaObject>>(s: S) => S =
  identity;

export const schemasRef: <
  C extends DeepReadonly<ComponentsObject>['schemas']
>() => <Name extends keyof C & string = keyof C & string>(
  name: Name
) => { $ref: `#/components/schemas/${Name}` } = () => (name) => ({
  $ref: `#/components/schemas/${name}`,
});
