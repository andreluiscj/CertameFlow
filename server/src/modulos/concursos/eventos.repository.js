import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';
import { montarInsercao } from '../../db/insercaoParcial.js';

/** Tarefas (eventos) dos concursos. */

const COLUNAS = `id, concurso_id, titulo, data, hora, cor, concluido,
  concluido_por, concluido_por_nome, concluido_em, created_at`;

// A conclusao fica fora: ela passa por definirConcluidas, que tambem grava quem
// concluiu e quando.
const COLUNAS_EDITAVEIS = new Set(['concurso_id', 'titulo', 'data', 'hora', 'cor']);

/**
 * Tarefas com o concurso embutido em concurso_cadastros, como o front recebia.
 * Sem concursoId, lista as de todos os concursos.
 */
export async function listar(concursoId) {
  const { rows } = await pool.query(
    `select e.id, e.concurso_id, e.titulo, e.data, e.hora, e.cor, e.concluido,
            e.concluido_por, e.concluido_por_nome, e.concluido_em, e.created_at,
            case when c.id is null then null else to_jsonb(c) end as concurso_cadastros
       from concurso_eventos e
       left join concurso_cadastros c on c.id = e.concurso_id
      where ($1::uuid is null or e.concurso_id = $1::uuid)
      order by e.data, e.id`,
    [concursoId ?? null],
  );
  return rows;
}

export async function buscarPorId(id, db = pool) {
  const { rows } = await db.query(`select ${COLUNAS} from concurso_eventos where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function nomeDoConcurso(concursoId, db = pool) {
  if (!concursoId) return null;
  const { rows } = await db.query('select nome from concurso_cadastros where id = $1', [concursoId]);
  return rows[0]?.nome ?? null;
}

export async function inserir(dados, db) {
  const { sql, valores } = montarInsercao({
    tabela: 'concurso_eventos',
    colunasPermitidas: COLUNAS_EDITAVEIS,
    dados,
    retorno: COLUNAS,
  });
  const { rows } = await db.query(sql, valores);
  return rows[0];
}

/** Varias tarefas do mesmo concurso numa unica instrucao, na ordem recebida. */
export async function inserirVarios(concursoId, eventos, db) {
  const { rows } = await db.query(
    `insert into concurso_eventos (concurso_id, titulo, data, hora, cor)
     select $1, titulo, data, hora, cor
       from unnest($2::text[], $3::date[], $4::time[], $5::text[]) with ordinality as t(titulo, data, hora, cor, ordem)
      order by ordem
     returning id`,
    [
      concursoId,
      eventos.map((e) => e.titulo),
      eventos.map((e) => e.data),
      eventos.map((e) => e.hora ?? null),
      eventos.map((e) => e.cor ?? null),
    ],
  );
  return rows;
}

export async function atualizar(id, alteracoes, db) {
  const atualizacao = montarAtualizacao({
    tabela: 'concurso_eventos',
    colunasEditaveis: COLUNAS_EDITAVEIS,
    id,
    alteracoes,
    retorno: COLUNAS,
    comUpdatedAt: false,
  });
  if (!atualizacao) return buscarPorId(id, db);
  const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
  return rows[0] ?? null;
}

export async function excluir(id, db) {
  const { rows } = await db.query(`delete from concurso_eventos where id = $1 returning ${COLUNAS}`, [id]);
  return rows[0] ?? null;
}

export async function excluirDoConcurso(concursoId, db) {
  const { rowCount } = await db.query('delete from concurso_eventos where concurso_id = $1', [concursoId]);
  return rowCount;
}

/**
 * Quem concluiu e quando: preenchidos ao concluir e limpos ao desmarcar. O nome
 * e copiado de usuarios, como nos logs, para continuar legivel se o usuario
 * mudar de nome ou for excluido. Usa os aliases t (conclusao) e u (usuario).
 */
const AUTORIA_DA_CONCLUSAO = `
        concluido_em = case when t.concluido then now() end,
        concluido_por = case when t.concluido then u.id end,
        concluido_por_nome = case when t.concluido then coalesce(u.nome, u.email) end`;

/**
 * Marca varias tarefas como concluidas ou nao, registrando o autor. Devolve so
 * as que realmente mudaram, para registrar uma atividade por tarefa alterada.
 */
export async function definirConcluidas(alteracoes, usuarioId, db) {
  const { rows } = await db.query(
    `update concurso_eventos e
        set concluido = t.concluido,${AUTORIA_DA_CONCLUSAO}
       from unnest($1::uuid[], $2::boolean[]) as t(id, concluido)
       left join usuarios u on u.id = $3::uuid
      where e.id = t.id and e.concluido is distinct from t.concluido
     returning e.id, e.concurso_id, e.titulo, e.data, e.concluido`,
    [alteracoes.map((a) => a.id), alteracoes.map((a) => a.concluido), usuarioId ?? null],
  );
  return rows;
}

/** Marca todas as tarefas do concurso, registrando o autor; devolve as que mudaram. */
export async function definirTodasConcluidas(concursoId, concluido, usuarioId, db) {
  const { rows } = await db.query(
    `update concurso_eventos e
        set concluido = t.concluido,${AUTORIA_DA_CONCLUSAO}
       from (select $2::boolean as concluido) as t
       left join usuarios u on u.id = $3::uuid
      where e.concurso_id = $1 and e.concluido is distinct from t.concluido
     returning e.id, e.concurso_id, e.titulo, e.data, e.concluido`,
    [concursoId, concluido, usuarioId ?? null],
  );
  return rows;
}

/** true se o concurso tem tarefas e todas estao concluidas. */
export async function todasConcluidas(concursoId, db) {
  const { rows } = await db.query(
    `select count(*) > 0 and bool_and(concluido) as todas
       from concurso_eventos
      where concurso_id = $1`,
    [concursoId],
  );
  return rows[0].todas === true;
}

/**
 * Finaliza o concurso, com a mesma cor que a tela ja usava. Devolve o nome e
 * se ele ja estava finalizado antes.
 */
export async function finalizarConcurso(concursoId, db) {
  const { rows } = await db.query(
    `with antes as (select status from concurso_cadastros where id = $1)
     update concurso_cadastros
        set status = 'Finalizado', cor = 'hsl(0, 0%, 0%)', updated_at = now()
      where id = $1
     returning nome, (select status from antes) = 'Finalizado' as ja_finalizado`,
    [concursoId],
  );
  return rows[0] ?? null;
}

/** Total de tarefas e concluidas por concurso, no formato { concurso_id: { total, concluidos } }. */
export async function progresso(concursoIds) {
  const { rows } = await pool.query(
    `select concurso_id, count(*)::int as total, count(*) filter (where concluido)::int as concluidos
       from concurso_eventos
      where concurso_id = any($1::uuid[])
      group by concurso_id`,
    [concursoIds],
  );
  return Object.fromEntries(rows.map((r) => [r.concurso_id, { total: r.total, concluidos: r.concluidos }]));
}
