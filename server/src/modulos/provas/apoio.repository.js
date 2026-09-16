import { pool } from '../../config/db.js';
import { criarTabelaSimples } from '../../db/tabelaSimples.js';

/** Cadastros de apoio do modulo Provas. */

export const niveis = criarTabelaSimples({
  tabela: 'provas_niveis',
  colunas: 'id, codigo, descricao, valor_questao, created_at, updated_at',
  colunasEditaveis: ['descricao', 'valor_questao'],
  ordem: 'codigo',
});

export const status = criarTabelaSimples({
  tabela: 'provas_status',
  colunas: 'id, codigo, descricao, created_at, updated_at',
  colunasEditaveis: ['descricao'],
  ordem: 'codigo',
});

export const areas = criarTabelaSimples({
  tabela: 'provas_areas_atuacao',
  colunas: 'id, codigo, descricao, created_at, updated_at',
  colunasEditaveis: ['descricao'],
  ordem: 'descricao',
});

export const cargos = criarTabelaSimples({
  tabela: 'provas_cargos',
  colunas: 'id, codigo, descricao, concurso_id, prova_id, nivel_id, created_at, updated_at',
  colunasEditaveis: ['descricao', 'concurso_id', 'prova_id', 'nivel_id'],
  ordem: 'codigo',
});

export async function listarBancos() {
  const { rows } = await pool.query(
    'select id, numero, nome, created_at from provas_bancos order by numero',
  );
  return rows;
}

export async function listarSexos() {
  const { rows } = await pool.query(
    'select id, nome, ordem from provas_elaboradores_sexo order by ordem',
  );
  return rows;
}

/** Varias areas numa unica instrucao: ou todas entram, ou nenhuma. */
export async function inserirAreas(descricoes, db = pool) {
  const { rows } = await db.query(
    `insert into provas_areas_atuacao (descricao)
     select d from unnest($1::text[]) with ordinality as t(d, ordem) order by ordem
     returning id, codigo, descricao, created_at, updated_at`,
    [descricoes],
  );
  return rows;
}

/** Quantidade de elaboradores por area, no formato { area_id: total }. */
export async function contarElaboradoresPorArea() {
  const { rows } = await pool.query(
    'select area_id, count(*)::int as total from provas_elaborador_areas group by area_id',
  );
  return Object.fromEntries(rows.map((r) => [r.area_id, r.total]));
}

/** Liga um elaborador a uma area. Ligar de novo quem ja esta ligado nao faz nada. */
export async function vincularElaboradorArea(areaId, elaboradorId, db = pool) {
  const { rowCount } = await db.query(
    `insert into provas_elaborador_areas (elaborador_id, area_id)
     values ($1, $2)
     on conflict (elaborador_id, area_id) do nothing`,
    [elaboradorId, areaId],
  );
  return rowCount > 0;
}

/** Desliga um elaborador de uma area. */
export async function desvincularElaboradorArea(areaId, elaboradorId, db = pool) {
  const { rowCount } = await db.query(
    'delete from provas_elaborador_areas where area_id = $1 and elaborador_id = $2',
    [areaId, elaboradorId],
  );
  return rowCount > 0;
}

export async function nomeDoElaborador(id, db = pool) {
  const { rows } = await db.query('select nome from provas_elaboradores where id = $1', [id]);
  return rows[0]?.nome ?? null;
}

export async function nomeDoConcurso(id, db = pool) {
  const { rows } = await db.query('select nome from concurso_cadastros where id = $1', [id]);
  return rows[0]?.nome ?? null;
}
