import { server } from '@oa-ts/express';
import { api } from './api';
import { impl } from './controller';

const app = server({ doc: api, controller: impl });

app.listen(3000, () => {
  console.log(`Example app listening on port 127.0.0.1:3000`);
});
