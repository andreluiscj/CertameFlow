import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';
import { montarInsercao } from '../../db/insercaoParcial.js';

const COLUNAS = `id, codigo, nome, email, celular, cpf, data_nascimento, pis, sexo_id,
  banco_id, tipo_conta, agencia, conta, created_at, updated_at`;

const COLUNAS_EDITAVEIS = new Set([
  'codigo', 'nome', 'email', 'celular', 'cpf', 'data_nascimento', 'pis',
  'sexo_id', 'banco_id', 'tipo_conta', 'agencia', 'conta',
]);

/** Elaboradores com as areas de atuacao embutidas em "areas". */
export async function listar() {
  const { rows } = await pool.query(
    `select e.id, e.codigo, e.nome, e.email, e.celular, e.cpf, e.data_nascimento, e.pis, e.sexo_id,
            e.banco_id, e.tipo_conta, e.agencia, e.conta, e.created_at, e.updated_at,
            coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'codigo', a.codigo, 'descricao', a.descricao)
                                       order by a.descricao)
                        from provas_elaborador_areas ea
                        join provas_areas_atuacao a on a.id = ea.area_id
                       where ea.elaborador_id = e.id), '[]'::jsonb) as areas
       from provas_elaboradores e
      order by e.codigo`,
  );
  return rows;
}

export async function inserir(dados, db) {
  const { sql, valores } = montarInsercao({
    tabela: 'provas_elaboradores',
    colunasPermitidas: COLUNAS_EDITAVEIS,
    dados,
    retorno: COLUNAS,
  });
  const { rows } = await db.query(sql, valores);
  return rows[0];
}

/** Altera o elaborador; devolve id, codigo e nome, ou null se ele nao existe. */
export async function atualizar(id, alteracoes, db) {
  const atualizacao = montarAtualizacao({
    tabela: 'provas_elaboradores',
    colunasEditaveis: COLUNAS_EDITAVEIS,
    id,
    alteracoes,
    retorno: 'id, codigo, nome',
  });
  if (!atualizacao) {
    const { rows } = await db.query('select id, codigo, nome from provas_elaboradores where id = $1', [id]);
    return rows[0] ?? null;
  }
  const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
  return rows[0] ?? null;
}

/** Exclui e devolve o elaborador excluido, ou null. */
export async function excluir(id, db = pool) {
  const { rows } = await db.query('delete from provas_elaboradores where id = $1 returning id, codigo, nome', [id]);
  return rows[0] ?? null;
}

/** Troca as areas do elaborador. A tabela de ligacao nao tem dependentes. */
export async function substituirAreas(elaboradorId, areaIds, db) {
  await db.query('delete from provas_elaborador_areas where elaborador_id = $1', [elaboradorId]);
  if (areaIds.length === 0) return;
  await db.query(
    `insert into provas_elaborador_areas (elaborador_id, area_id)
     select $1, unnest($2::uuid[])`,
    [elaboradorId, areaIds],
  );
}

/** Insere varios elaboradores numa unica instrucao, na ordem recebida. */
export async function inserirVarios(elaboradores, db) {
  const coluna = (nome) => elaboradores.map((e) => e[nome] ?? null);
  const { rows } = await db.query(
    `insert into provas_elaboradores
       (codigo, nome, email, celular, cpf, data_nascimento, pis, sexo_id, banco_id, tipo_conta, agencia, conta)
     select codigo, nome, email, celular, cpf, data_nascimento, pis, sexo_id, banco_id, tipo_conta, agencia, conta
       from unnest($1::integer[], $2::text[], $3::text[], $4::text[], $5::text[], $6::date[], $7::text[],
                   $8::uuid[], $9::uuid[], $10::text[], $11::text[], $12::text[])
            with ordinality as t(codigo, nome, email, celular, cpf, data_nascimento, pis, sexo_id, banco_id,
                                 tipo_conta, agencia, conta, ordem)
      order by ordem
     returning id, codigo`,
    [
      coluna('codigo'), coluna('nome'), coluna('email'), coluna('celular'), coluna('cpf'),
      coluna('data_nascimento'), coluna('pis'), coluna('sexo_id'), coluna('banco_id'),
      coluna('tipo_conta'), coluna('agencia'), coluna('conta'),
    ],
  );
  return rows;
}

/** Liga varios pares elaborador/area numa unica instrucao. */
export async function inserirLigacoesDeAreas(ligacoes, db) {
  if (ligacoes.length === 0) return;
  await db.query(
    `insert into provas_elaborador_areas (elaborador_id, area_id)
     select * from unnest($1::uuid[], $2::uuid[])`,
    [ligacoes.map((l) => l.elaborador_id), ligacoes.map((l) => l.area_id)],
  );
}

/** Dados de pagamento dos elaboradores informados, para a planilha de RPA. */
export async function listarParaRpa(ids) {
  const { rows } = await pool.query(
    `select e.id, e.nome, e.cpf, e.email, e.celular, e.data_nascimento, e.pis, e.tipo_conta, e.agencia, e.conta,
            (select jsonb_build_object('numero', b.numero) from provas_bancos b where b.id = e.banco_id) as provas_bancos,
            (select jsonb_build_object('nome', s.nome) from provas_elaboradores_sexo s where s.id = e.sexo_id)
              as provas_elaboradores_sexo
       from provas_elaboradores e
      where e.id = any($1::uuid[])`,
    [ids],
  );
  return rows;
}
