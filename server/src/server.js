import { criarApp } from './app.js';
import { env } from './config/env.js';

const app = criarApp();

app.listen(env.porta, () => {
  console.log(`API rodando em http://localhost:${env.porta}`);
});
