import { FORMATO_UUID } from '../util/uuid.js';

/**
 * Recusa com 400 um :id que nao seja UUID. Sem isto o Postgres rejeitaria o
 * valor com erro de tipo, e a resposta sairia como 500 em vez de erro do cliente.
 */
export function validarUuid(req, res, next, id) {
  if (!FORMATO_UUID.test(id)) {
    res.status(400).json({ mensagem: 'Identificador inválido.', campos: {} });
    return;
  }
  next();
}
