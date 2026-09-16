import { FORMATO_UUID } from '../../util/uuid.js';
import { exigirTextos, lancarSeHouver, naoEncontrado } from '../../util/validacao.js';
import { aspas } from '../../util/formatacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './apoio.repository.js';

const atividades = registroDeAtividades('provas');

/**
 * Regras dos cadastros de apoio (niveis, status, areas e cargos). Todos seguem
 * o mesmo formato: descricao obrigatoria na criacao e, se enviada na alteracao,
 * nao pode ficar vazia.
 */
function cadastro(tabela, recurso, { entidade, artigo, nome }) {
  const obrigatorios = { descricao: 'Informe a descrição.' };
  const doRegistro = (r) => ({ entidade, entidadeId: r.id });

  return {
    listar: () => tabela.listar(),

    async criar(dados) {
      exigirTextos(dados, obrigatorios);
      return atividades.registrando(async (db, registrar) => {
        const registro = await tabela.inserir(dados, db);
        await registrar('criou', `Cadastrou ${artigo} ${nome} ${aspas(registro.descricao)}.`, doRegistro(registro));
        return registro;
      });
    },

    async atualizar(id, alteracoes) {
      if (alteracoes?.descricao !== undefined) exigirTextos(alteracoes, obrigatorios);
      return atividades.registrando(async (db, registrar) => {
        const registro = await tabela.atualizar(id, alteracoes, db);
        if (!registro) throw naoEncontrado(recurso, id);
        await registrar('alterou', `Alterou ${artigo} ${nome} ${aspas(registro.descricao)}.`, doRegistro(registro));
        return registro;
      });
    },

    async excluir(id) {
      return atividades.registrando(async (db, registrar) => {
        const registro = await tabela.buscarPorId(id, db);
        if (!registro || !(await tabela.excluir(id, db))) throw naoEncontrado(recurso, id);
        await registrar('excluiu', `Excluiu ${artigo} ${nome} ${aspas(registro.descricao)}.`, doRegistro(registro));
      });
    },
  };
}

export const niveis = cadastro(repository.niveis, 'Nível', { entidade: 'nivel', artigo: 'o', nome: 'nível' });
export const status = cadastro(repository.status, 'Status', { entidade: 'status', artigo: 'o', nome: 'status' });
export const areas = cadastro(repository.areas, 'Área', { entidade: 'area', artigo: 'a', nome: 'área' });
export const cargos = cadastro(repository.cargos, 'Cargo', { entidade: 'cargo', artigo: 'o', nome: 'cargo' });

export const listarBancos = () => repository.listarBancos();
export const listarSexos = () => repository.listarSexos();
export const contarElaboradoresPorArea = () => repository.contarElaboradoresPorArea();

export async function importarAreas(dados) {
  const descricoes = dados?.descricoes;
  if (
    !Array.isArray(descricoes) ||
    descricoes.length === 0 ||
    descricoes.some((d) => typeof d !== 'string' || d.trim() === '')
  ) {
    lancarSeHouver({ descricoes: 'Informe ao menos uma área com descrição.' });
  }
  return atividades.registrando(async (db, registrar) => {
    const inseridas = await repository.inserirAreas(descricoes.map((d) => d.trim()), db);
    await registrar('importou', `Importou ${inseridas.length} área(s) de atuação de planilha.`, { entidade: 'area' });
    return inseridas;
  });
}

/**
 * Liga um elaborador a area, pela tela de Areas de Atuacao. Area ou
 * elaborador inexistente e recusado pela FK e vira 400.
 */
export async function vincularElaboradorArea(areaId, dados) {
  const elaboradorId = dados?.elaborador_id;
  if (typeof elaboradorId !== 'string' || !FORMATO_UUID.test(elaboradorId)) {
    lancarSeHouver({ elaborador_id: 'Informe o elaborador.' });
  }
  return atividades.registrando(async (db, registrar) => {
    if (await repository.vincularElaboradorArea(areaId, elaboradorId, db)) {
      const area = await repository.areas.buscarPorId(areaId, db);
      const elaborador = await repository.nomeDoElaborador(elaboradorId, db);
      await registrar('vinculou', `Adicionou o elaborador ${aspas(elaborador)} à área ${aspas(area?.descricao)}.`, {
        entidade: 'area',
        entidadeId: areaId,
      });
    }
  });
}

export async function desvincularElaboradorArea(areaId, elaboradorId) {
  return atividades.registrando(async (db, registrar) => {
    if (await repository.desvincularElaboradorArea(areaId, elaboradorId, db)) {
      const area = await repository.areas.buscarPorId(areaId, db);
      const elaborador = await repository.nomeDoElaborador(elaboradorId, db);
      await registrar('desvinculou', `Removeu o elaborador ${aspas(elaborador)} da área ${aspas(area?.descricao)}.`, {
        entidade: 'area',
        entidadeId: areaId,
      });
    }
  });
}
