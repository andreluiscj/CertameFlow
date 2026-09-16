import { pool } from '../../config/db.js';

/**
 * Tarefas nao concluidas com data anterior a hoje. Tarefas de concurso pausado
 * ficam de fora, como no alerta da tela inicial.
 */
export async function listarTarefasAtrasadas(hoje) {
  const { rows } = await pool.query(
    `select e.id, e.titulo, e.data, c.nome as concurso_nome, c.concurso_id as concurso_codigo
       from concurso_eventos e
       left join concurso_cadastros c on c.id = e.concurso_id
      where not e.concluido
        and e.data < $1
        and coalesce(c.status, '') <> 'Pausado'
      order by e.data, c.nome`,
    [hoje],
  );
  return rows;
}

/** Parcelas nao pagas com vencimento anterior a hoje. */
export async function listarParcelasAtrasadas(hoje) {
  const { rows } = await pool.query(
    `select p.id, p.contrato_id, p.ordem, p.data_pagamento,
            round(k.valor_total * p.percentual / 100, 2) as valor,
            cl.descricao as cliente, cl.cidade, cl.uf
       from contrato_parcelas p
       join contrato_cadastros k on k.id = p.contrato_id
       join contrato_clientes cl on cl.id = k.cliente_id
      where not p.pago
        and p.data_pagamento < $1
      order by p.data_pagamento, cl.descricao, p.ordem`,
    [hoje],
  );
  return rows;
}

/**
 * Usuarios que nao desativaram as notificacoes e podem ver algo do resumo:
 * administradores, ou quem tem o modulo Contratos ou Concursos.
 */
export async function listarDestinatarios() {
  const { rows } = await pool.query(
    `select id, nome, email, nivel_acesso, modulos
       from usuarios
      where receber_notificacoes
        and (nivel_acesso = 4 or modulos && array['contratos', 'concursos'])
        and email <> ''
      order by nome nulls last, email`,
  );
  return rows;
}

export async function jaEnviado(data) {
  const { rowCount } = await pool.query('select 1 from notificacoes_envios where data = $1', [data]);
  return rowCount > 0;
}

/**
 * Reserva o envio do dia. Devolve false se outro processo (ou uma execucao
 * anterior, antes de a API reiniciar) ja enviou o resumo desta data.
 */
export async function reservarEnvio(data) {
  const { rowCount } = await pool.query(
    'insert into notificacoes_envios (data) values ($1) on conflict (data) do nothing',
    [data],
  );
  return rowCount > 0;
}

export async function concluirEnvio(data, destinatarios) {
  await pool.query('update notificacoes_envios set destinatarios = $2, enviado_em = now() where data = $1', [
    data,
    destinatarios,
  ]);
}

/** Libera a reserva quando nenhum e-mail saiu, para tentar de novo mais tarde. */
export async function cancelarEnvio(data) {
  await pool.query('delete from notificacoes_envios where data = $1', [data]);
}

export async function ultimoEnvio() {
  const { rows } = await pool.query(
    'select data, destinatarios, enviado_em from notificacoes_envios order by data desc limit 1',
  );
  return rows[0] ?? null;
}
