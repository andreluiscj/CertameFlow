import { pool } from '../../config/db.js';

/**
 * Tabelas de apoio do modulo Contratos: listas usadas nos formularios.
 * Tipos de processo, status do contrato e status da parcela so aparecem se
 * estiverem ativos, como o front ja filtrava.
 */

export async function listarTiposProcesso() {
  const { rows } = await pool.query(
    `select id, descricao, ativo, created_at
       from contrato_tipo_processo
      where ativo = true
      order by descricao`,
  );
  return rows;
}

export async function listarStatus() {
  const { rows } = await pool.query(
    `select id, descricao, ativo, created_at
       from contrato_status
      where ativo = true
      order by descricao`,
  );
  return rows;
}

export async function listarStatusParcela() {
  const { rows } = await pool.query(
    `select id, descricao, ativo, created_at
       from contrato_parcela_status
      where ativo = true
      order by descricao`,
  );
  return rows;
}

export async function listarTiposCliente() {
  const { rows } = await pool.query(
    'select id, nome, created_at from contrato_cliente_tipo order by nome',
  );
  return rows;
}

export async function inserirTipoCliente(nome, db = pool) {
  const { rows } = await db.query(
    'insert into contrato_cliente_tipo (nome) values ($1) returning id, nome, created_at',
    [nome],
  );
  return rows[0];
}
