import { identity } from 'fp-ts/lib/function';
import { DeepReadonly, openapi } from './common';

export const operation: <
  Id extends string,
  O extends DeepReadonly<openapi.OperationObject>
>(
  operationId: Id,
  o: O
) => O & { operationId: Id } = (operationId, o) => ({ ...o, operationId });

export const openApi: <O extends DeepReadonly<openapi.Document>>(o: O) => O =
  identity;
