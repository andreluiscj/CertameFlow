import { criarApp } from './app.js';
import { env } from './config/env.js';
import { iniciarAgendador } from './modulos/notificacoes/notificacoes.service.js';

const app = criarApp();

app.listen(env.porta, () => {
  console.log(`API rodando em http://localhost:${env.porta}`);
  iniciarAgendador();
});
