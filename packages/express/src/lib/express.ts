import express from 'express';
import { Document, HttpMethods } from '@oa-ts/openapi';
import { router, RouterOptions } from '@oa-ts/controller';

export const server: <Doc extends Document>(
  opts: RouterOptions<Doc>
) => express.Application = (opts) => {
  const app = express();
  app.use(express.json());
  const r = router(opts);
  app.all(/.*/, async (req, res) => {
    console.log(req.path, req.body);
    const rsp = await r({
      method: req.method.toLowerCase() as HttpMethods,
      path: req.path,
      body: req.body,
    })();
    console.log(rsp);

    res.status(rsp.code).json(rsp.body);
  });
  return app;
};
