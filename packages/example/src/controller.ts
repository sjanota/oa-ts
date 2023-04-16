import { Controller } from '@oa-ts/controller';
import { task } from 'fp-ts';
import { api } from './api';

type ApiImpl = Controller<typeof api>;

const getUserById: ApiImpl['getUserById'] = () =>
  task.of({ code: 200, body: { name: 'aaa' } });

const createUser: ApiImpl['createUser'] = () =>
  task.of({ code: 200, body: { name: 'aaa' } });

export const impl: ApiImpl = { getUserById, createUser };
