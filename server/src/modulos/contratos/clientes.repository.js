import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';

const COLUNAS = 'id, descricao, cidade, uf, tipo_id, created_at, updated_at';

const COLUNAS_EDITAVEIS = new Set(['descricao', 'cidade', 'uf', 'tipo_id']);

/** Lista os clientes com o tipo embutido, no mesmo formato do Supabase. */
export async function listar() {
  const { rows } = await pool.query(
    `select c.id, c.descricao, c.cidade, c.uf, c.tipo_id, c.created_at, c.updated_at,
            (select jsonb_build_object('id', t.id, 'nome', t.nome)
               from contrato_cliente_tipo t
              where t.id = c.tipo_id) as contrato_cliente_tipo
       from contrato_clientes c
      order by c.descricao`,
  );
  return rows;
}

export async function buscarPorId(id, db = pool) {
  const { rows } = await db.query(`select ${COLUNAS} from contrato_clientes where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function inserir(dados, db = pool) {
  const { rows } = await db.query(
    `insert into contrato_clientes (descricao, cidade, uf, tipo_id)
     values ($1, $2, $3, $4)
     returning ${COLUNAS}`,
    [dados.descricao, dados.cidade, dados.uf, dados.tipo_id],
  );
  return rows[0];
}

export async function atualizar(id, alteracoes, db = pool) {
  const atualizacao = montarAtualizacao({
    tabela: 'contrato_clientes',
    colunasEditaveis: COLUNAS_EDITAVEIS,
    id,
    alteracoes,
    retorno: COLUNAS,
  });
  if (!atualizacao) return buscarPorId(id, db);

  const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
  return rows[0] ?? null;
}

export async function excluir(id, db = pool) {
  const { rowCount } = await db.query('delete from contrato_clientes where id = $1', [id]);
  return rowCount > 0;
}
