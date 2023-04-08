import { Task } from 'fp-ts/lib/Task';
import { Equal, Expect } from '@oa-ts/common';
import { Controller } from './document-to-controller';
import { doc, Error, Id, User } from './example-schema';

declare const controller: Controller<typeof doc>;

type _Test = Expect<
  Equal<
    (typeof controller)['getUserById'],
    (args: { readonly id: Id }) => Task<
      | {
          code: 200;
          body: User;
        }
      | {
          code: 404;
          body: Error;
        }
    >
  >
>;
