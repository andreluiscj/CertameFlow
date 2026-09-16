import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';

/**
 * Acesso a concurso_cadastros com SQL escrito a mao.
 *
 * Todo valor vindo da requisicao entra por parametro ($1, $2, ...), nunca por
 * concatenacao de texto. O unico trecho montado dinamicamente e a lista de
 * colunas do UPDATE, e ela so aceita nomes presentes em COLUNAS_EDITAVEIS.
 */

const COLUNAS = `id, concurso_id, nome, tipo, uf, cidade, cor, status,
  observacoes, nota_titulo, cod_projeto, created_at, updated_at`;

const COLUNAS_EDITAVEIS = new Set([
  'concurso_id', 'nome', 'tipo', 'uf', 'cidade', 'cor',
  'status', 'observacoes', 'nota_titulo', 'cod_projeto',
]);

export async function listar() {
  const { rows } = await pool.query(
    `select ${COLUNAS} from concurso_cadastros order by created_at desc`,
  );
  return rows;
}

export async function buscarPorId(id, db = pool) {
  const { rows } = await db.query(
    `select ${COLUNAS} from concurso_cadastros where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function inserir(dados, db = pool) {
  const { rows } = await db.query(
    `insert into concurso_cadastros
       (concurso_id, nome, tipo, uf, cidade, cor, status, observacoes, nota_titulo, cod_projeto)
     values
       ($1, $2, $3, $4, $5,
        coalesce($6::text, '#3B82F6'),
        coalesce($7::text, 'Em andamento'),
        $8::text,
        coalesce($9::boolean, false),
        $10::text)
     returning ${COLUNAS}`,
    [
      dados.concurso_id,
      dados.nome,
      dados.tipo,
      dados.uf,
      dados.cidade,
      dados.cor ?? null,
      dados.status ?? null,
      dados.observacoes ?? null,
      dados.nota_titulo ?? null,
      dados.cod_projeto ?? null,
    ],
  );
  return rows[0];
}

/** Atualiza apenas os campos enviados (ver db/atualizacaoParcial.js). */
export async function atualizar(id, alteracoes, db = pool) {
  const atualizacao = montarAtualizacao({
    tabela: 'concurso_cadastros',
    colunasEditaveis: COLUNAS_EDITAVEIS,
    id,
    alteracoes,
    retorno: COLUNAS,
  });

  if (!atualizacao) {
    return buscarPorId(id, db);
  }

  const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
  return rows[0] ?? null;
}

/** Devolve true se havia um concurso com esse id. */
export async function excluir(id, db = pool) {
  const { rowCount } = await db.query('delete from concurso_cadastros where id = $1', [id]);
  return rowCount > 0;
}
