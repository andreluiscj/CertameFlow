import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';

/*
 * Ordem das disciplinas: a tela mostra as disciplinas na ordem em que vieram
 * da planilha importada, e nenhuma coluna guarda essa ordem. Todas as linhas
 * de uma importacao tem o mesmo created_at (now() da transacao), entao o
 * desempate e pela posicao fisica (ctid), que e a ordem de insercao. E a mesma
 * ordem que o Supabase devolvia. Disciplinas nunca sao alteradas depois de
 * importadas, o que mantem essa posicao estavel.
 */
const ORDEM_DISCIPLINAS = 'd.created_at, d.ctid';

const CARGOS_DA_PROVA = `
  coalesce((select jsonb_agg(jsonb_build_object(
                     'id', c.id, 'descricao', c.descricao, 'prova_id', c.prova_id,
                     'provas_niveis', (select jsonb_build_object('descricao', n.descricao)
                                         from provas_niveis n where n.id = c.nivel_id))
                   order by c.codigo)
              from provas_cargos c
             where c.prova_id = p.id), '[]'::jsonb)`;

/** Prova com cargos e disciplinas, para a tela de detalhe. */
export async function buscarCompleta(id) {
  const { rows } = await pool.query(
    `select p.id, p.codigo, p.concurso_id,
            ${CARGOS_DA_PROVA} as provas_cargos,
            coalesce((select jsonb_agg(jsonb_build_object(
                               'id', d.id, 'prova_id', d.prova_id, 'disciplina', d.disciplina, 'tipo', d.tipo,
                               'questoes', d.questoes, 'total_questoes_prova', d.total_questoes_prova)
                             order by ${ORDEM_DISCIPLINAS})
                        from provas_disciplinas d
                       where d.prova_id = p.id), '[]'::jsonb) as provas_disciplinas
       from provas_cadastro p
      where p.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Provas do concurso com cargos e disciplinas, para a tela de pedidos de questoes. */
export async function listarPorConcurso(concursoId) {
  const { rows } = await pool.query(
    `select p.id, p.codigo,
            ${CARGOS_DA_PROVA} as provas_cargos,
            coalesce((select jsonb_agg(jsonb_build_object(
                               'id', d.id, 'prova_id', d.prova_id, 'questoes', d.questoes,
                               'provas_disciplina_niveis',
                               coalesce((select jsonb_agg(jsonb_build_object('contabilizar', dn.contabilizar))
                                           from provas_disciplina_niveis dn
                                          where dn.disciplina_id = d.id), '[]'::jsonb))
                             order by ${ORDEM_DISCIPLINAS})
                        from provas_disciplinas d
                       where d.prova_id = p.id), '[]'::jsonb) as provas_disciplinas
       from provas_cadastro p
      where p.concurso_id = $1
      order by p.codigo`,
    [concursoId],
  );
  return rows;
}

/** Provas do concurso com disciplinas, niveis e valor por questao, para o resumo financeiro. */
export async function listarResumoFinanceiro(concursoId) {
  const { rows } = await pool.query(
    `select p.id,
            coalesce((select jsonb_agg(jsonb_build_object(
                               'id', d.id, 'prova_id', d.prova_id, 'disciplina', d.disciplina,
                               'provas_disciplina_niveis',
                               coalesce((select jsonb_agg(jsonb_build_object(
                                                  'id', dn.id, 'nivel_id', dn.nivel_id, 'qtd', dn.qtd,
                                                  'contabilizar', dn.contabilizar,
                                                  'provas_niveis', (select jsonb_build_object('descricao', n.descricao,
                                                                                              'valor_questao', n.valor_questao)
                                                                      from provas_niveis n where n.id = dn.nivel_id)))
                                           from provas_disciplina_niveis dn
                                          where dn.disciplina_id = d.id), '[]'::jsonb))
                             order by ${ORDEM_DISCIPLINAS})
                        from provas_disciplinas d
                       where d.prova_id = p.id), '[]'::jsonb) as provas_disciplinas
       from provas_cadastro p
      where p.concurso_id = $1`,
    [concursoId],
  );
  return rows;
}

export async function contarPorConcurso() {
  const { rows } = await pool.query(
    'select concurso_id, count(*)::int as total from provas_cadastro group by concurso_id',
  );
  return rows;
}

/**
 * Exclui a prova. Cargos, disciplinas e os niveis das disciplinas saem pelas
 * FKs "on delete cascade", na mesma instrucao. Devolve codigo e concurso da
 * prova excluida, ou null.
 */
export async function excluir(id, db = pool) {
  const { rows } = await db.query(
    `delete from provas_cadastro p
      where p.id = $1
     returning p.codigo, p.concurso_id, (select nome from concurso_cadastros c where c.id = p.concurso_id) as concurso_nome`,
    [id],
  );
  return rows[0] ?? null;
}

// ----- Niveis das disciplinas -----

const COLUNAS_DISCIPLINA_NIVEL = `id, disciplina_id, nivel_id, qtd, elaborador_id, status_id,
  contrato_status_id, contabilizar, prazo_entrega, created_at, updated_at`;

const DISCIPLINA_NIVEL_EDITAVEIS = new Set([
  'nivel_id', 'qtd', 'elaborador_id', 'status_id', 'contrato_status_id', 'contabilizar', 'prazo_entrega',
]);

/** Linhas de nivel/elaboracao das disciplinas de uma prova. */
export async function listarDisciplinaNiveis(provaId) {
  const { rows } = await pool.query(
    `select dn.id, dn.disciplina_id, dn.nivel_id, dn.qtd, dn.elaborador_id, dn.status_id,
            dn.contrato_status_id, dn.contabilizar, dn.prazo_entrega,
            (select jsonb_build_object('descricao', n.descricao) from provas_niveis n where n.id = dn.nivel_id)
              as provas_niveis
       from provas_disciplina_niveis dn
       join provas_disciplinas d on d.id = dn.disciplina_id
      where d.prova_id = $1`,
    [provaId],
  );
  return rows;
}

/** Contexto de uma linha de nivel para as descricoes: disciplina, prova e concurso. */
export async function descreverDisciplinaNivel(id, db = pool) {
  const { rows } = await db.query(
    `select d.disciplina, p.codigo as prova, c.nome as concurso, n.descricao as nivel,
            e.nome as elaborador, s.descricao as status
       from provas_disciplina_niveis dn
       join provas_disciplinas d on d.id = dn.disciplina_id
       join provas_cadastro p on p.id = d.prova_id
       left join concurso_cadastros c on c.id = p.concurso_id
       left join provas_niveis n on n.id = dn.nivel_id
       left join provas_elaboradores e on e.id = dn.elaborador_id
       left join provas_status s on s.id = dn.status_id
      where dn.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function atualizarDisciplinaNivel(id, alteracoes, db = pool) {
  const atualizacao = montarAtualizacao({
    tabela: 'provas_disciplina_niveis',
    colunasEditaveis: DISCIPLINA_NIVEL_EDITAVEIS,
    id,
    alteracoes,
    retorno: COLUNAS_DISCIPLINA_NIVEL,
  });
  if (!atualizacao) {
    const { rows } = await db.query(
      `select ${COLUNAS_DISCIPLINA_NIVEL} from provas_disciplina_niveis where id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }
  const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
  return rows[0] ?? null;
}

// ----- Importacao (sempre dentro de uma transacao: recebem a conexao db) -----

export async function buscarNiveisPorDescricao(descricoes, db) {
  const { rows } = await db.query(
    'select id, descricao from provas_niveis where descricao = any($1::text[])',
    [descricoes],
  );
  return rows;
}

/** Remove provas (e dependentes, por cascata) e cargos do concurso. */
export async function limparConcurso(concursoId, db) {
  await db.query('delete from provas_cadastro where concurso_id = $1', [concursoId]);
  await db.query('delete from provas_cargos where concurso_id = $1', [concursoId]);
}

export async function inserirProvas(concursoId, codigos, db) {
  const { rows } = await db.query(
    `insert into provas_cadastro (concurso_id, codigo)
     select $1, codigo from unnest($2::integer[]) with ordinality as t(codigo, ordem) order by ordem
     returning id, codigo`,
    [concursoId, codigos],
  );
  return rows;
}

export async function inserirCargos(concursoId, cargos, db) {
  await db.query(
    `insert into provas_cargos (concurso_id, descricao, prova_id, nivel_id)
     select $1, descricao, prova_id, nivel_id
       from unnest($2::text[], $3::uuid[], $4::uuid[]) with ordinality as t(descricao, prova_id, nivel_id, ordem)
      order by ordem`,
    [concursoId, cargos.map((c) => c.descricao), cargos.map((c) => c.prova_id), cargos.map((c) => c.nivel_id)],
  );
}

export async function inserirDisciplinas(disciplinas, db) {
  const coluna = (nome) => disciplinas.map((d) => d[nome]);
  const { rows } = await db.query(
    `insert into provas_disciplinas (prova_id, disciplina, tipo, questoes, total_questoes_prova)
     select prova_id, disciplina, tipo, questoes, total_questoes_prova
       from unnest($1::uuid[], $2::text[], $3::text[], $4::integer[], $5::integer[])
            with ordinality as t(prova_id, disciplina, tipo, questoes, total_questoes_prova, ordem)
      order by ordem
     returning id, prova_id, disciplina`,
    [coluna('prova_id'), coluna('disciplina'), coluna('tipo'), coluna('questoes'), coluna('total_questoes_prova')],
  );
  return rows;
}

/**
 * Id do status "Solicitar", usado como situacao inicial. Como o
 * maybeSingle() do Supabase, so devolve o id se houver exatamente um.
 */
export async function buscarStatusSolicitar(db) {
  const { rows } = await db.query(
    "select id from provas_status where descricao ilike 'solicitar' limit 2",
  );
  return rows.length === 1 ? rows[0].id : null;
}

export async function inserirDisciplinaNiveis(linhas, statusId, db) {
  await db.query(
    `insert into provas_disciplina_niveis (disciplina_id, nivel_id, qtd, status_id, contabilizar)
     select disciplina_id, nivel_id, qtd, $4, false
       from unnest($1::uuid[], $2::uuid[], $3::integer[]) with ordinality as t(disciplina_id, nivel_id, qtd, ordem)
      order by ordem`,
    [linhas.map((l) => l.disciplina_id), linhas.map((l) => l.nivel_id), linhas.map((l) => l.qtd), statusId],
  );
}

// ----- RPA -----

/** Totais do concurso e linhas de elaboracao com o valor por questao, para a planilha de RPA. */
export async function buscarBaseRpa(concursoId) {
  const { rows } = await pool.query(
    `select (select count(*)::int from provas_cadastro where concurso_id = $1) as total_provas,
            (select count(*)::int
               from provas_disciplinas d
               join provas_cadastro p on p.id = d.prova_id
              where p.concurso_id = $1) as total_disciplinas,
            coalesce((select jsonb_agg(jsonb_build_object(
                               'elaborador_id', dn.elaborador_id, 'qtd', dn.qtd, 'contabilizar', dn.contabilizar,
                               'provas_niveis', (select jsonb_build_object('valor_questao', n.valor_questao)
                                                   from provas_niveis n where n.id = dn.nivel_id)))
                        from provas_disciplina_niveis dn
                        join provas_disciplinas d on d.id = dn.disciplina_id
                        join provas_cadastro p on p.id = d.prova_id
                       where p.concurso_id = $1), '[]'::jsonb) as niveis`,
    [concursoId],
  );
  return rows[0];
}

// ----- Encerramentos -----

export async function listarEncerramentos() {
  const { rows } = await pool.query('select concurso_id, encerrado_em from provas_concurso_encerramentos');
  return rows;
}

/** Marca o concurso como encerrado; encerrar de novo atualiza a data. */
export async function encerrar(concursoId, db = pool) {
  const { rows } = await db.query(
    `insert into provas_concurso_encerramentos (concurso_id, encerrado_em)
     values ($1, now())
     on conflict (concurso_id) do update set encerrado_em = excluded.encerrado_em
     returning concurso_id, encerrado_em`,
    [concursoId],
  );
  return rows[0];
}

export async function reabrir(concursoId, db = pool) {
  const { rowCount } = await db.query('delete from provas_concurso_encerramentos where concurso_id = $1', [concursoId]);
  return rowCount > 0;
}

export async function nomeDoConcurso(id, db = pool) {
  const { rows } = await db.query('select nome from concurso_cadastros where id = $1', [id]);
  return rows[0]?.nome ?? null;
}
