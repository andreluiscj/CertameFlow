import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';

const COLUNAS = 'id, banco, convenio, conta, agencia, created_at, updated_at';

const COLUNAS_EDITAVEIS = new Set(['banco', 'convenio', 'conta', 'agencia']);

export async function listar() {
  const { rows } = await pool.query(
    `select ${COLUNAS} from contrato_conta_recebimento order by banco`,
  );
  return rows;
}

export async function buscarPorId(id, db = pool) {
  const { rows } = await db.query(
    `select ${COLUNAS} from contrato_conta_recebimento where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function inserir(dados, db = pool) {
  const { rows } = await db.query(
    `insert into contrato_conta_recebimento (banco, convenio, conta, agencia)
     values ($1, $2, $3, $4)
     returning ${COLUNAS}`,
    [dados.banco, dados.convenio ?? null, dados.conta ?? null, dados.agencia ?? null],
  );
  return rows[0];
}

export async function atualizar(id, alteracoes, db = pool) {
  const atualizacao = montarAtualizacao({
    tabela: 'contrato_conta_recebimento',
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
  const { rowCount } = await db.query('delete from contrato_conta_recebimento where id = $1', [id]);
  return rowCount > 0;
}
