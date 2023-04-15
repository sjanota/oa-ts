import {
  ComponentsObject,
  Document,
  OperationObject,
  PathsObject,
  SchemaObject,
} from '@oa-ts/openapi';
import { identity } from 'fp-ts/lib/function';

export const operation: <
  Id extends string,
  O extends Omit<OperationObject, 'operationId'>
>(
  operationId: Id,
  o: O
) => O & { operationId: Id } = (operationId, o) => ({ ...o, operationId });

export const openApi: <D extends Document>(o: D) => D = identity;

export const paths: <P extends PathsObject>(p: P) => P = identity;

export const components: <P extends ComponentsObject>(p: P) => P = identity;

export const schema: <S extends SchemaObject>(s: S) => S = identity;

export const schemasRef: <C extends ComponentsObject['schemas']>() => <
  Name extends keyof C & string = keyof C & string
>(
  name: Name
) => { $ref: `#/components/schemas/${Name}` } = () => (name) => ({
  $ref: `#/components/schemas/${name}`,
});
