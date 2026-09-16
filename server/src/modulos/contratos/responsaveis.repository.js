import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';

const COLUNAS = 'id, cliente_id, nome, cargo, email, telefone, created_at, updated_at';

const COLUNAS_EDITAVEIS = new Set(['cliente_id', 'nome', 'cargo', 'email', 'telefone']);

/**
 * Lista os responsaveis com o cliente embutido. Quando clienteId e informado,
 * restringe aos responsaveis daquele cliente.
 */
export async function listar(clienteId) {
  const { rows } = await pool.query(
    `select r.id, r.cliente_id, r.nome, r.cargo, r.email, r.telefone, r.created_at, r.updated_at,
            (select jsonb_build_object('id', c.id, 'descricao', c.descricao, 'cidade', c.cidade, 'uf', c.uf)
               from contrato_clientes c
              where c.id = r.cliente_id) as contrato_clientes
       from contrato_responsaveis r
      where ($1::uuid is null or r.cliente_id = $1::uuid)
      order by r.nome`,
    [clienteId ?? null],
  );
  return rows;
}

export async function buscarPorId(id, db = pool) {
  const { rows } = await db.query(`select ${COLUNAS} from contrato_responsaveis where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function inserir(dados, db = pool) {
  const { rows } = await db.query(
    `insert into contrato_responsaveis (cliente_id, nome, cargo, email, telefone)
     values ($1, $2, $3, $4, $5)
     returning ${COLUNAS}`,
    [dados.cliente_id, dados.nome, dados.cargo ?? null, dados.email ?? null, dados.telefone ?? null],
  );
  return rows[0];
}

export async function atualizar(id, alteracoes, db = pool) {
  const atualizacao = montarAtualizacao({
    tabela: 'contrato_responsaveis',
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
  const { rowCount } = await db.query('delete from contrato_responsaveis where id = $1', [id]);
  return rowCount > 0;
}

/**
 * Ids dos responsaveis atuais do cliente. O "for update" trava essas linhas ate
 * o fim da transacao, para duas edicoes simultaneas do mesmo cliente nao se cruzarem.
 */
export async function listarIdsDoCliente(clienteId, db) {
  const { rows } = await db.query(
    'select id from contrato_responsaveis where cliente_id = $1 for update',
    [clienteId],
  );
  return rows.map((r) => r.id);
}

/** Remove os responsaveis do cliente cujo id nao esta na lista mantida. */
export async function excluirDoClienteExceto(clienteId, idsMantidos, db) {
  await db.query(
    'delete from contrato_responsaveis where cliente_id = $1 and not (id = any($2::uuid[]))',
    [clienteId, idsMantidos],
  );
}

/** Atualiza varios responsaveis do cliente numa unica instrucao, preservando os ids. */
export async function atualizarVarios(clienteId, responsaveis, db) {
  await db.query(
    `update contrato_responsaveis r
        set nome = t.nome, cargo = t.cargo, email = t.email, telefone = t.telefone, updated_at = now()
       from unnest($2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[]) as t(id, nome, cargo, email, telefone)
      where r.id = t.id and r.cliente_id = $1`,
    [
      clienteId,
      responsaveis.map((r) => r.id),
      responsaveis.map((r) => r.nome),
      responsaveis.map((r) => r.cargo ?? null),
      responsaveis.map((r) => r.email ?? null),
      responsaveis.map((r) => r.telefone ?? null),
    ],
  );
}

/** Responsaveis do cliente, em ordem alfabetica. Recebe a conexao da transacao. */
export async function listarDoCliente(clienteId, db) {
  const { rows } = await db.query(
    `select ${COLUNAS} from contrato_responsaveis where cliente_id = $1 order by nome`,
    [clienteId],
  );
  return rows;
}

/** Insere varios responsaveis de um cliente numa unica instrucao. */
export async function inserirVarios(clienteId, responsaveis, db) {
  const { rows } = await db.query(
    `insert into contrato_responsaveis (cliente_id, nome, cargo, email, telefone)
     select $1, t.nome, t.cargo, t.email, t.telefone
       from unnest($2::text[], $3::text[], $4::text[], $5::text[]) as t(nome, cargo, email, telefone)
     returning ${COLUNAS}`,
    [
      clienteId,
      responsaveis.map((r) => r.nome),
      responsaveis.map((r) => r.cargo ?? null),
      responsaveis.map((r) => r.email ?? null),
      responsaveis.map((r) => r.telefone ?? null),
    ],
  );
  return rows;
}

/** Contratos dos quais o responsavel participa, com cliente e status embutidos. */
export async function listarContratos(responsavelId) {
  const { rows } = await pool.query(
    `select v.contrato_id, v.responsavel_id, v.created_at,
            (select jsonb_build_object(
                      'id', k.id,
                      'cliente_id', k.cliente_id,
                      'data_vigencia', k.data_vigencia,
                      'valor_total', k.valor_total,
                      'cliente', (select jsonb_build_object('id', c.id, 'descricao', c.descricao, 'cidade', c.cidade, 'uf', c.uf)
                                    from contrato_clientes c where c.id = k.cliente_id),
                      'status', (select jsonb_build_object('id', s.id, 'descricao', s.descricao)
                                   from contrato_status s where s.id = k.status_id))
               from contrato_cadastros k
              where k.id = v.contrato_id) as contrato
       from contrato_cadastro_responsaveis v
      where v.responsavel_id = $1`,
    [responsavelId],
  );
  return rows;
}
