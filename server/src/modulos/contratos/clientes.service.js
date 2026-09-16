import { aspas } from '../../util/formatacao.js';
import { exigirTextos, lancarSeHouver, naoEncontrado } from '../../util/validacao.js';
import * as repository from './clientes.repository.js';
import * as responsaveis from './responsaveis.repository.js';
import { registroDeAtividades } from '../logs/atividades.service.js';

const OBRIGATORIOS = {
  descricao: 'Informe a descrição do cliente.',
  cidade: 'Informe a cidade.',
  uf: 'Informe a UF.',
  tipo_id: 'Informe o tipo do cliente.',
};

export const listar = () => repository.listar();

const atividades = registroDeAtividades('contratos');

const descreverCliente = (c) => `${aspas(c.descricao)} (${c.cidade}/${c.uf})`;
const doCliente = (c) => ({ entidade: 'cliente', entidadeId: c.id });

export async function criar(dados) {
  exigirTextos(dados, OBRIGATORIOS);
  return atividades.registrando(async (db, registrar) => {
    const cliente = await repository.inserir(dados, db);
    await registrar('criou', `Cadastrou o cliente ${descreverCliente(cliente)}.`, doCliente(cliente));
    return cliente;
  });
}

export async function atualizar(id, alteracoes) {
  return atividades.registrando(async (db, registrar) => {
    const cliente = await repository.atualizar(id, alteracoes, db);
    if (!cliente) throw naoEncontrado('Cliente', id);
    await registrar('alterou', `Alterou o cliente ${descreverCliente(cliente)}.`, doCliente(cliente));
    return cliente;
  });
}

export async function excluir(id) {
  return atividades.registrando(async (db, registrar) => {
    const cliente = await repository.buscarPorId(id, db);
    if (!cliente || !(await repository.excluir(id, db))) throw naoEncontrado('Cliente', id);
    await registrar('excluiu', `Excluiu o cliente ${descreverCliente(cliente)} e seus responsáveis.`, doCliente(cliente));
  });
}

/**
 * Deixa os responsaveis do cliente iguais a lista informada, sem recriar os
 * que continuam.
 *
 * Item com id atualiza o responsavel existente; item sem id e um responsavel
 * novo; responsavel atual que nao veio na lista e excluido. Manter os ids
 * preserva os vinculos com contratos: antes, apagar e reinserir todos dava ids
 * novos, e o banco removia em cascata os vinculos de contrato_cadastro_responsaveis
 * a cada edicao do cliente.
 *
 * Tudo roda numa transacao: se qualquer passo falhar, nada muda.
 */
export async function substituirResponsaveis(clienteId, lista) {
  if (!Array.isArray(lista)) {
    lancarSeHouver({ responsaveis: 'Informe a lista de responsáveis.' });
  }

  const campos = {};
  const idsVistos = new Set();
  lista.forEach((r, indice) => {
    if (typeof r?.nome !== 'string' || r.nome.trim() === '') {
      campos[`responsaveis[${indice}].nome`] = 'Informe o nome do responsável.';
    }
    if (r?.id != null) {
      if (idsVistos.has(r.id)) campos[`responsaveis[${indice}].id`] = 'Responsável repetido na lista.';
      idsVistos.add(r.id);
    }
  });
  lancarSeHouver(campos);

  const mantidos = lista.filter((r) => r.id != null);
  const novos = lista.filter((r) => r.id == null);

  return atividades.registrando(async (db, registrar) => {
    const atuais = new Set(await responsaveis.listarIdsDoCliente(clienteId, db));

    const alheios = {};
    lista.forEach((r, indice) => {
      if (r.id != null && !atuais.has(r.id)) {
        alheios[`responsaveis[${indice}].id`] = 'Responsável não pertence a este cliente.';
      }
    });
    lancarSeHouver(alheios);

    await responsaveis.excluirDoClienteExceto(clienteId, mantidos.map((r) => r.id), db);
    if (mantidos.length > 0) await responsaveis.atualizarVarios(clienteId, mantidos, db);
    if (novos.length > 0) await responsaveis.inserirVarios(clienteId, novos, db);

    const removidos = [...atuais].filter((idAtual) => !mantidos.some((r) => r.id === idAtual)).length;
    if (novos.length > 0 || removidos > 0) {
      const cliente = await repository.buscarPorId(clienteId, db);
      const partes = [
        novos.length > 0 && `${novos.length} incluído(s)`,
        removidos > 0 && `${removidos} removido(s)`,
      ].filter(Boolean);
      await registrar(
        'alterou',
        `Atualizou os responsáveis do cliente ${aspas(cliente?.descricao)}: ${partes.join(', ')}.`,
        { entidade: 'cliente', entidadeId: clienteId },
      );
    }
    return responsaveis.listarDoCliente(clienteId, db);
  });
}
