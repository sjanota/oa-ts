import { io } from '@oa-ts/common';
import {
  ComponentsObject,
  Document,
  OperationObject,
  PathsObject,
  ResponseObject,
  SchemaObject,
} from '@oa-ts/openapi';
import { SchemaToCodec } from '@oa-ts/schema';
import { identity } from 'fp-ts/lib/function';

export type Component<
  C extends keyof ComponentsObject,
  Name extends string,
  Def extends DslSchemaObject
> = {
  category: C;
  name: Name;
  def: Def;
};

export type DslSchemaObject = Omit<SchemaObject, 'items' | 'properties'> & {
  items?: Component<'schemas', string, DslSchemaObject> | DslSchemaObject;
  properties?: {
    [name: string]:
      | Component<'schemas', string, DslSchemaObject>
      | DslSchemaObject;
  };
};

type ResolveProperties<Def extends DslSchemaObject> = Def extends {
  properties: infer PropertiesDef;
}
  ? Omit<Def, 'properties'> & {
      properties: {
        [k in keyof PropertiesDef]: ResolveRawSchemaObject<PropertiesDef[k]>;
      };
    }
  : Def;

type ResolveItems<Def extends DslSchemaObject> = Def extends {
  items: infer ItemDef;
}
  ? Omit<Def, 'items'> & { items: ResolveRawSchemaObject<ItemDef> }
  : Def;

type ResolveRawSchemaObject<C> = C extends Component<
  'schemas',
  string,
  infer Def
>
  ? Def extends SchemaObject
    ? Def
    : ResolveItems<ResolveProperties<Def>>
  : C;

export type TypeOfSchema<
  C extends Component<'schemas', string, DslSchemaObject>
> = io.TypeOf<SchemaToCodec<ResolveRawSchemaObject<C>>>;

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

export const schema: <Name extends string, Def extends DslSchemaObject>(
  name: Name,
  def: Def
) => Component<'schemas', Name, Def> = (name, def) => ({
  category: 'schemas',
  name,
  def,
});

export const response: <Name extends string, Def extends ResponseObject>(
  name: Name,
  def: Def
) => Component<'responses', Name, Def> = (name, def) => ({
  category: 'responses',
  name,
  def,
});

export const ref: <C extends keyof ComponentsObject, Name extends string>(
  component: Component<C, Name, DslSchemaObject>
) => { $ref: `#/components/${C}/${Name}` } = ({ category, name }) => ({
  $ref: `#/components/${category}/${name}`,
});

export type Components<
  Cs extends unknown[],
  Acc extends Partial<Record<keyof ComponentsObject, []>> = Partial<
    Record<keyof ComponentsObject, []>
  >
> = Cs extends [
  Component<infer Key, infer Name, DslSchemaObject>,
  ...infer Rest
]
  ? Components<
      Rest,
      Omit<Acc, Key> & {
        [k in Key]: [Name, ...(Acc[k] extends Array<unknown> ? Acc[k] : [])];
      }
    >
  : Cleanup<RemoveExtra<Acc>>;

type Cleanup<T> = T extends object ? { [K in keyof T]-?: Cleanup<T[K]> } : T;
type RemoveExtra<T> = {
  [k in keyof T as T[k] extends [any, ...infer _] ? k : never]: T[k];
};
