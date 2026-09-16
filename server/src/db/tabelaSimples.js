import { pool } from '../config/db.js';
import { montarAtualizacao } from './atualizacaoParcial.js';
import { montarInsercao } from './insercaoParcial.js';

/**
 * Repository de uma tabela de cadastro simples (listar, criar, alterar,
 * excluir), para nao repetir o mesmo SQL em cada tabela de apoio.
 *
 * tabela, colunas e ordem sao definidos no codigo, nunca na requisicao.
 */
export function criarTabelaSimples({ tabela, colunas, colunasEditaveis, ordem }) {
  const editaveis = new Set(colunasEditaveis);

  async function buscarPorId(id, db = pool) {
    const { rows } = await db.query(`select ${colunas} from ${tabela} where id = $1`, [id]);
    return rows[0] ?? null;
  }

  return {
    buscarPorId,

    async listar() {
      const { rows } = await pool.query(`select ${colunas} from ${tabela} order by ${ordem}`);
      return rows;
    },

    async inserir(dados, db = pool) {
      const { sql, valores } = montarInsercao({
        tabela,
        colunasPermitidas: editaveis,
        dados,
        retorno: colunas,
      });
      const { rows } = await db.query(sql, valores);
      return rows[0];
    },

    async atualizar(id, alteracoes, db = pool) {
      const atualizacao = montarAtualizacao({
        tabela,
        colunasEditaveis: editaveis,
        id,
        alteracoes,
        retorno: colunas,
      });
      if (!atualizacao) return buscarPorId(id, db);

      const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
      return rows[0] ?? null;
    },

    async excluir(id, db = pool) {
      const { rowCount } = await db.query(`delete from ${tabela} where id = $1`, [id]);
      return rowCount > 0;
    },
  };
}
