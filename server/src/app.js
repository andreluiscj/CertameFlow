import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { limiteGeral } from './middleware/limites.js';
import { opcoesCors } from './config/cors.js';
import { registrarRequisicoes } from './middleware/registroDeRequisicoes.js';
import { tratarErros } from './middleware/tratadorDeErros.js';
import { administracaoRoutes } from './modulos/administracao/administracao.routes.js';
import { concursosRoutes } from './modulos/concursos/concursos.routes.js';
import { contratosRoutes } from './modulos/contratos/contratos.routes.js';
import { usuariosRoutes } from './modulos/usuarios/usuarios.routes.js';
import { provasRoutes } from './modulos/provas/provas.routes.js';

export function criarApp() {
  const app = express();

  if (env.proxiesConfiaveis > 0) app.set('trust proxy', env.proxiesConfiaveis);
  app.use(helmet());
  app.use(cors(opcoesCors));
  app.use(express.json());
  app.use(registrarRequisicoes);

  // Sem autenticacao: usada por monitoramento para saber se o processo esta de pe.
  app.get('/saude', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', limiteGeral);
  app.use('/api/concursos', concursosRoutes);
  app.use('/api/contratos', contratosRoutes);
  app.use('/api/provas', provasRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/administracao', administracaoRoutes);

  app.use((req, res) => {
    res.status(404).json({ mensagem: 'Rota não encontrada.' });
  });

  app.use(tratarErros);

  return app;
}
