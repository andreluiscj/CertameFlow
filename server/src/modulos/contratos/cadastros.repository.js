import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';

const COLUNAS = `id, cliente_id, tipo_processo_id, forma_pagamento_id, conta_recebimento_id,
  status_id, data_vigencia, valor_total, concurso_id, created_at, updated_at`;

const COLUNAS_PARCELA = `id, contrato_id, ordem, percentual, data_pagamento, status_id,
  pago, data_pagamento_efetivo, created_at, updated_at`;

const COLUNAS_EDITAVEIS_PARCELA = new Set([
  'ordem', 'percentual', 'data_pagamento', 'status_id', 'pago', 'data_pagamento_efetivo',
]);

/**
 * Contrato com todos os relacionamentos que as telas usam, no mesmo formato
 * que a consulta aninhada do Supabase devolvia (cliente, tipo_processo, status,
 * forma_pagamento, conta_recebimento, parcelas com status, concurso).
 * As parcelas ja saem ordenadas.
 */
const SELECT_COMPLETO = `
  select k.id, k.cliente_id, k.tipo_processo_id, k.forma_pagamento_id, k.conta_recebimento_id,
         k.status_id, k.data_vigencia, k.valor_total, k.concurso_id, k.created_at, k.updated_at,
         (select jsonb_build_object('id', c.id, 'descricao', c.descricao, 'cidade', c.cidade, 'uf', c.uf)
            from contrato_clientes c where c.id = k.cliente_id) as cliente,
         (select jsonb_build_object('id', tp.id, 'descricao', tp.descricao)
            from contrato_tipo_processo tp where tp.id = k.tipo_processo_id) as tipo_processo,
         (select jsonb_build_object('id', s.id, 'descricao', s.descricao)
            from contrato_status s where s.id = k.status_id) as status,
         (select to_jsonb(fp) from contrato_forma_pagamento fp where fp.id = k.forma_pagamento_id) as forma_pagamento,
         (select to_jsonb(cr) from contrato_conta_recebimento cr where cr.id = k.conta_recebimento_id) as conta_recebimento,
         coalesce(
           (select jsonb_agg(
                     to_jsonb(p) || jsonb_build_object(
                       'status', (select jsonb_build_object('id', ps.id, 'descricao', ps.descricao)
                                    from contrato_parcela_status ps where ps.id = p.status_id))
                     order by p.ordem)
              from contrato_parcelas p where p.contrato_id = k.id),
           '[]'::jsonb) as parcelas,
         (select jsonb_build_object('id', cc.id, 'nome', cc.nome, 'cidade', cc.cidade, 'uf', cc.uf, 'concurso_id', cc.concurso_id)
            from concurso_cadastros cc where cc.id = k.concurso_id) as concurso
    from contrato_cadastros k`;

export async function listar() {
  const { rows } = await pool.query(`${SELECT_COMPLETO} order by k.created_at desc`);
  return rows;
}

export async function buscarPorId(id, db = pool) {
  const { rows } = await db.query(`${SELECT_COMPLETO} where k.id = $1`, [id]);
  return rows[0] ?? null;
}

// ----- Etapas do cadastro. Recebem a conexao da transacao aberta no service. -----

/** Resumo legado da forma de pagamento, gravado junto com o contrato. */
export async function inserirFormaPagamento(quantidadeParcelas, db) {
  const { rows } = await db.query(
    `insert into contrato_forma_pagamento (quantidade_parcelas, valor_parcela, data_pagamento)
     values ($1, 0, null)
     returning id`,
    [quantidadeParcelas],
  );
  return rows[0];
}

export async function inserirContrato(dados, db) {
  const { rows } = await db.query(
    `insert into contrato_cadastros
       (cliente_id, tipo_processo_id, status_id, data_vigencia, forma_pagamento_id,
        conta_recebimento_id, valor_total)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning ${COLUNAS}`,
    [
      dados.cliente_id,
      dados.tipo_processo_id,
      dados.status_id,
      dados.data_vigencia ?? null,
      dados.forma_pagamento_id,
      dados.conta_recebimento_id ?? null,
      dados.valor_total,
    ],
  );
  return rows[0];
}

export async function inserirParcelas(contratoId, parcelas, db) {
  await db.query(
    `insert into contrato_parcelas (contrato_id, ordem, percentual, data_pagamento)
     select $1, t.ordem, t.percentual, t.data_pagamento
       from unnest($2::integer[], $3::numeric[], $4::date[]) as t(ordem, percentual, data_pagamento)`,
    [
      contratoId,
      parcelas.map((p) => p.ordem),
      parcelas.map((p) => p.percentual),
      parcelas.map((p) => p.data_pagamento ?? null),
    ],
  );
}

export async function vincularResponsaveis(contratoId, responsavelIds, db) {
  const { rows } = await db.query(
    `insert into contrato_cadastro_responsaveis (contrato_id, responsavel_id)
     select $1, unnest($2::uuid[])
     returning contrato_id, responsavel_id, created_at`,
    [contratoId, responsavelIds],
  );
  return rows;
}

export async function desvincularResponsaveis(contratoId, db) {
  await db.query('delete from contrato_cadastro_responsaveis where contrato_id = $1', [contratoId]);
}

// ----- Demais operacoes -----

/** Responsaveis vinculados a um contrato, com os dados do responsavel embutidos, por nome. */
export async function listarResponsaveis(contratoId) {
  const { rows } = await pool.query(
    `select v.contrato_id, v.responsavel_id, v.created_at,
            jsonb_build_object('id', r.id, 'nome', r.nome, 'cargo', r.cargo,
                               'email', r.email, 'telefone', r.telefone, 'cliente_id', r.cliente_id) as responsavel
       from contrato_cadastro_responsaveis v
       join contrato_responsaveis r on r.id = v.responsavel_id
      where v.contrato_id = $1
      order by r.nome`,
    [contratoId],
  );
  return rows;
}

/** cliente_id do contrato, ou null se o contrato nao existe. */
export async function buscarClienteDoContrato(contratoId, db = pool) {
  const { rows } = await db.query('select cliente_id from contrato_cadastros where id = $1', [contratoId]);
  return rows[0]?.cliente_id ?? null;
}

/** Vincula um responsavel ao contrato. Vincular de novo quem ja esta vinculado nao faz nada. */
export async function vincularResponsavel(contratoId, responsavelId, db = pool) {
  await db.query(
    `insert into contrato_cadastro_responsaveis (contrato_id, responsavel_id)
     values ($1, $2)
     on conflict (contrato_id, responsavel_id) do nothing`,
    [contratoId, responsavelId],
  );
}

/** Remove o vinculo de um responsavel com o contrato. */
export async function desvincularResponsavel(contratoId, responsavelId, db = pool) {
  await db.query(
    'delete from contrato_cadastro_responsaveis where contrato_id = $1 and responsavel_id = $2',
    [contratoId, responsavelId],
  );
}

/** Vincula (ou desvincula, com null) o contrato a um concurso. */
export async function atualizarConcurso(id, concursoId, db = pool) {
  const { rows } = await db.query(
    `update contrato_cadastros set concurso_id = $2, updated_at = now()
      where id = $1
      returning ${COLUNAS}`,
    [id, concursoId],
  );
  return rows[0] ?? null;
}

export async function excluir(id, db = pool) {
  const { rowCount } = await db.query('delete from contrato_cadastros where id = $1', [id]);
  return rowCount > 0;
}

export async function atualizarParcela(id, alteracoes, db = pool) {
  const atualizacao = montarAtualizacao({
    tabela: 'contrato_parcelas',
    colunasEditaveis: COLUNAS_EDITAVEIS_PARCELA,
    id,
    alteracoes,
    retorno: COLUNAS_PARCELA,
  });

  if (!atualizacao) {
    const { rows } = await db.query(`select ${COLUNAS_PARCELA} from contrato_parcelas where id = $1`, [id]);
    return rows[0] ?? null;
  }

  const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
  return rows[0] ?? null;
}
