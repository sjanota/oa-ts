import { identity } from 'fp-ts/lib/function';
import { DeepReadonly, openapi } from '@oa-ts/common';

export const operation: <
  Id extends string,
  O extends DeepReadonly<openapi.OperationObject>
>(
  operationId: Id,
  o: O
) => O & { operationId: Id } = (operationId, o) => ({ ...o, operationId });

export const openApi: <D extends DeepReadonly<openapi.Document>>(o: D) => D =
  identity;

export const paths: <P extends DeepReadonly<openapi.PathsObject>>(p: P) => P =
  identity;

export const components: <P extends DeepReadonly<openapi.ComponentsObject>>(
  p: P
) => P = identity;

export const schema: <S extends DeepReadonly<openapi.SchemaObject>>(s: S) => S =
  identity;

export const schemasRef: <
  C extends DeepReadonly<openapi.ComponentsObject>['schemas']
>() => <Name extends keyof C & string = keyof C & string>(
  name: Name
) => { $ref: `#/components/schemas/${Name}` } = () => (name) => ({
  $ref: `#/components/schemas/${name}`,
});
