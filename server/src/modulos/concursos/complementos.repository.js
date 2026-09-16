import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';

/** Opcoes de formulario, observacoes mensais da agenda e notas de titulos. */

export async function listarTipos() {
  const { rows } = await pool.query(
    'select id, nome, ativo, ordem, created_at from concurso_tipos where ativo = true order by ordem',
  );
  return rows;
}

export async function listarStatus() {
  const { rows } = await pool.query(
    'select id, nome, ativo, ordem, created_at from concurso_status where ativo = true order by ordem',
  );
  return rows;
}

// ----- Observacoes -----

const COLUNAS_OBSERVACAO = 'id, ano, mes, conteudo, usuario_id, usuario_nome, created_at, updated_at';

/** Comentarios da agenda do mes, do mais antigo para o mais recente. */
export async function listarObservacoes(ano, mes) {
  const { rows } = await pool.query(
    `select ${COLUNAS_OBSERVACAO} from concurso_observacoes where ano = $1 and mes = $2 order by created_at, id`,
    [ano, mes],
  );
  return rows;
}

/**
 * Grava um comentario no mes. O autor vem do usuario autenticado; o nome e
 * copiado de usuarios, para o comentario continuar identificado mesmo que o
 * usuario seja removido depois.
 */
export async function inserirObservacao(ano, mes, conteudo, usuarioId, db) {
  const { rows } = await db.query(
    `insert into concurso_observacoes (ano, mes, conteudo, usuario_id, usuario_nome)
     select $1, $2, $3, u.id, u.nome
       from (select $4::uuid as id) as eu
       left join usuarios u on u.id = eu.id
     returning ${COLUNAS_OBSERVACAO}`,
    [ano, mes, conteudo, usuarioId],
  );
  return rows[0];
}

/** Remove o comentario e devolve o que foi removido (ou null). */
export async function excluirObservacao(id, db) {
  const { rows } = await db.query(
    `delete from concurso_observacoes where id = $1 returning ${COLUNAS_OBSERVACAO}`,
    [id],
  );
  return rows[0] ?? null;
}

// ----- Notas de titulos -----

const COLUNAS_NOTA = 'id, concurso_id, junto_inscricoes, data_inicio, data_termino, created_at, updated_at';
const NOTA_EDITAVEIS = new Set(['junto_inscricoes', 'data_inicio', 'data_termino']);

export async function listarNotas() {
  const { rows } = await pool.query(`select ${COLUNAS_NOTA} from concurso_notas_titulos order by created_at desc`);
  return rows;
}

export async function buscarNotaDoConcurso(concursoId) {
  const { rows } = await pool.query(`select ${COLUNAS_NOTA} from concurso_notas_titulos where concurso_id = $1`, [
    concursoId,
  ]);
  return rows[0] ?? null;
}

/** Cria ou altera a nota de titulo do concurso (unique concurso_id), so com os campos enviados. */
export async function salvarNota(dados, db) {
  const campos = [...NOTA_EDITAVEIS].filter((c) => dados[c] !== undefined);
  const colunas = ['concurso_id', ...campos];
  const valores = [dados.concurso_id, ...campos.map((c) => dados[c])];
  const marcadores = colunas.map((_, i) => `$${i + 1}`).join(', ');
  const atualizacao = campos.length > 0
    ? `do update set ${campos.map((c) => `${c} = excluded.${c}`).join(', ')}, updated_at = now()`
    : 'do update set updated_at = now()';

  const { rows } = await db.query(
    `insert into concurso_notas_titulos (${colunas.join(', ')})
     values (${marcadores})
     on conflict (concurso_id) ${atualizacao}
     returning ${COLUNAS_NOTA}`,
    valores,
  );
  return rows[0];
}

export async function atualizarNota(id, alteracoes, db) {
  const atualizacao = montarAtualizacao({
    tabela: 'concurso_notas_titulos',
    colunasEditaveis: NOTA_EDITAVEIS,
    id,
    alteracoes,
    retorno: COLUNAS_NOTA,
  });
  if (!atualizacao) {
    const { rows } = await db.query(`select ${COLUNAS_NOTA} from concurso_notas_titulos where id = $1`, [id]);
    return rows[0] ?? null;
  }
  const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
  return rows[0] ?? null;
}

export async function excluirNota(id, db) {
  const { rows } = await db.query(`delete from concurso_notas_titulos where id = $1 returning ${COLUNAS_NOTA}`, [id]);
  return rows[0] ?? null;
}
