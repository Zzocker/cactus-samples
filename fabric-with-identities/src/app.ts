import express, { Application, json, urlencoded } from 'express';
import { serve, setup } from 'swagger-ui-express';
import { load } from 'js-yaml';
import { join } from 'path';
import { readFileSync } from 'fs';

import Endpoint from './endpoint';

const app: Application = express();
const PORT = 9999;

app.use(json());
app.use(urlencoded({ extended: true }));

const ORG_NAME = process.env.ORG_NAME || 'org1';

const openAPISpec: any = load(readFileSync(join(__dirname, '..', 'openapi.yaml'), 'utf-8'));

// beautification
let orgFullName: string = 'Organizations-';
if (ORG_NAME === 'org1') {
  orgFullName += '1';
  openAPISpec.info.title += ``;
} else {
  orgFullName += '2';
}
openAPISpec.info.title += ` ${orgFullName}`;

app.use('/api-docs', serve, setup(openAPISpec));

const endpoint = new Endpoint({
  logLevel: 'DEBUG',
  orgName: ORG_NAME,
});

app.use('/v1', endpoint.router);

app.listen(PORT, () => {
  console.log('#'.repeat(50));
  console.log('Cactus Samples - Fabric With Identities ' + orgFullName);
  console.log(`Started on Port : ${PORT}`);
  console.log(`Swagger UI : http://localhost:${PORT}/api-docs`);
  console.log('#'.repeat(50));
});
