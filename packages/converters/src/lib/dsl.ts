import { DeepReadonly, openapi } from './common';

export const operation: <
  Id extends string,
  O extends DeepReadonly<openapi.OperationObject>
>(
  operationId: Id,
  o: O
) => O & { operationId: Id } = (operationId, o) => ({ ...o, operationId });
