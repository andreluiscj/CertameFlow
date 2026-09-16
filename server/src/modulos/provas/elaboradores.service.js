import { aspas } from '../../util/formatacao.js';
import { exigirTextos, lancarSeHouver, naoEncontrado } from '../../util/validacao.js';
import { FORMATO_UUID, validarListaDeIds } from '../../util/uuid.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './elaboradores.repository.js';

const atividades = registroDeAtividades('provas');
const descrever = (e) => `${aspas(e.nome)} (cód. ${e.codigo})`;
const doElaborador = (e) => ({ entidade: 'elaborador', entidadeId: e.id });

const OBRIGATORIOS = { nome: 'Informe o nome do elaborador.' };

function separarAreas(dados) {
  const { area_ids: areaIds, ...elaborador } = dados ?? {};
  if (areaIds !== undefined && !validarListaDeIds(areaIds)) {
    lancarSeHouver({ area_ids: 'Lista de áreas inválida.' });
  }
  return { elaborador, areaIds };
}

export const listar = () => repository.listar();
export async function excluir(id) {
  return atividades.registrando(async (db, registrar) => {
    const elaborador = await repository.excluir(id, db);
    if (!elaborador) throw naoEncontrado('Elaborador', id);
    await registrar('excluiu', `Excluiu o elaborador ${descrever(elaborador)}.`, doElaborador(elaborador));
  });
}

/**
 * Cadastra o elaborador e liga as areas numa transacao, para que uma falha
 * nao deixe o elaborador sem areas.
 */
export async function criar(dados) {
  exigirTextos(dados, OBRIGATORIOS);
  const { elaborador, areaIds = [] } = separarAreas(dados);

  return atividades.registrando(async (db, registrar) => {
    const criado = await repository.inserir(elaborador, db);
    await repository.substituirAreas(criado.id, areaIds, db);
    await registrar('criou', `Cadastrou o elaborador ${descrever(criado)}.`, doElaborador(criado));
    return criado;
  });
}

/**
 * Altera o elaborador e, se area_ids vier no corpo, troca as areas, tudo numa
 * transacao. Antes, uma falha depois de apagar as areas deixava o elaborador
 * sem nenhuma.
 */
export async function atualizar(id, dados) {
  if (dados?.nome !== undefined) exigirTextos(dados, OBRIGATORIOS);
  const { elaborador, areaIds } = separarAreas(dados);

  return atividades.registrando(async (db, registrar) => {
    const atualizado = await repository.atualizar(id, elaborador, db);
    if (!atualizado) throw naoEncontrado('Elaborador', id);
    if (areaIds !== undefined) await repository.substituirAreas(id, areaIds, db);
    await registrar('alterou', `Alterou o elaborador ${descrever(atualizado)}.`, doElaborador(atualizado));
    return { id };
  });
}

/**
 * Importa elaboradores da planilha: todos entram com suas areas, ou nenhum.
 * Antes, uma falha ao ligar as areas deixava os elaboradores gravados sem elas.
 */
export async function importar(dados) {
  const linhas = dados?.elaboradores;
  if (!Array.isArray(linhas) || linhas.length === 0) {
    lancarSeHouver({ elaboradores: 'Informe ao menos um elaborador.' });
  }

  const campos = {};
  linhas.forEach((l, i) => {
    if (!Number.isInteger(l?.codigo) || l.codigo <= 0) campos[`elaboradores[${i}].codigo`] = 'Código inválido.';
    if (typeof l?.nome !== 'string' || l.nome.trim() === '') campos[`elaboradores[${i}].nome`] = 'Nome vazio.';
    if (l?.area_id != null && !FORMATO_UUID.test(String(l.area_id))) {
      campos[`elaboradores[${i}].area_id`] = 'Área inválida.';
    }
  });
  lancarSeHouver(campos);

  return atividades.registrando(async (db, registrar) => {
    const inseridos = await repository.inserirVarios(linhas, db);
    const idPorCodigo = new Map(inseridos.map((e) => [e.codigo, e.id]));
    const ligacoes = linhas
      .filter((l) => l.area_id && idPorCodigo.has(l.codigo))
      .map((l) => ({ elaborador_id: idPorCodigo.get(l.codigo), area_id: l.area_id }));
    await repository.inserirLigacoesDeAreas(ligacoes, db);
    await registrar('importou', `Importou ${inseridos.length} elaborador(es) de planilha.`, { entidade: 'elaborador' });
    return { importados: inseridos.length };
  });
}

export async function listarParaRpa(ids) {
  const lista = typeof ids === 'string' && ids !== '' ? ids.split(',') : [];
  if (!validarListaDeIds(lista)) lancarSeHouver({ ids: 'Lista de elaboradores inválida.' });
  return lista.length === 0 ? [] : repository.listarParaRpa(lista);
}
