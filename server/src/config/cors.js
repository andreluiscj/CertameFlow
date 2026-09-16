import { ErroHttp } from '../middleware/tratadorDeErros.js';
import { env } from './env.js';

/**
 * Libera apenas as origens conhecidas do frontend. Uma origem fora da lista
 * recebe 403.
 *
 * O erro sai com status definido para que o tratador de erros responda 403
 * sem registrar stack trace: uma origem desconhecida e requisicao recusada,
 * nao falha do servidor.
 */
export const opcoesCors = {
  origin(origem, callback) {
    // "origem" vem undefined em chamadas sem navegador (curl, health checks).
    if (!origem || env.corsOrigens.includes(origem)) {
      callback(null, true);
      return;
    }
    callback(new ErroHttp(403, 'Origem não permitida.'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
};
