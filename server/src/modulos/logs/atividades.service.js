import { emTransacao } from '../../config/db.js';
import { usuarioAtual } from '../../config/contexto.js';
import * as repository from './atividades.repository.js';

const LIMITE_PADRAO = 500;
const LIMITE_MAXIMO = 2000;

/**
 * Registrador de atividades de um modulo.
 *
 * Uso nos services:
 *
 *   const atividades = registroDeAtividades('provas');
 *   return atividades.registrando(async (db, registrar) => {
 *     const nivel = await repository.inserir(dados, db);
 *     await registrar('criou', `Cadastrou o nível "${nivel.descricao}".`, { entidade: 'nivel', entidadeId: nivel.id });
 *     return nivel;
 *   });
 *
 * A alteracao e o registro rodam na mesma transacao. O usuario vem do contexto
 * da requisicao autenticada (config/contexto.js).
 */
export function registroDeAtividades(modulo) {
  function registrarCom(db) {
    return (acao, descricao, { entidade, entidadeId } = {}) =>
      repository.inserir(db, { modulo, acao, descricao, entidade, entidadeId, usuarioId: usuarioAtual() });
  }

  return {
    /** Abre uma transacao e entrega a conexao e a funcao de registro. */
    registrando(trabalho) {
      return emTransacao((db) => trabalho(db, registrarCom(db)));
    },

    /** Para quem ja esta dentro de uma transacao aberta. */
    registrarCom,
  };
}

export function listar(modulo, limite) {
  const n = Number.parseInt(limite, 10);
  const limiteValido = Number.isInteger(n) && n > 0 ? Math.min(n, LIMITE_MAXIMO) : LIMITE_PADRAO;
  return repository.listar(modulo, limiteValido);
}

/** Handler Express que lista as atividades do modulo. */
export function rotaDeLogs(modulo) {
  return async (req, res) => {
    res.json(await listar(modulo, req.query.limite));
  };
}
