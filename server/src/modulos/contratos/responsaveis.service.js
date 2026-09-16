import { aspas } from '../../util/formatacao.js';
import { exigirTextos, naoEncontrado } from '../../util/validacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as clientes from './clientes.repository.js';
import * as repository from './responsaveis.repository.js';

export const listar = (clienteId) => repository.listar(clienteId);
export const listarContratos = (responsavelId) => repository.listarContratos(responsavelId);

const atividades = registroDeAtividades('contratos');

async function descrever(responsavel, db) {
  const cliente = await clientes.buscarPorId(responsavel.cliente_id, db);
  return `${aspas(responsavel.nome)}${cliente ? ` do cliente ${aspas(cliente.descricao)}` : ''}`;
}
const doResponsavel = (r) => ({ entidade: 'responsavel', entidadeId: r.id });

export async function criar(dados) {
  exigirTextos(dados, {
    cliente_id: 'Informe o cliente.',
    nome: 'Informe o nome do responsável.',
  });
  return atividades.registrando(async (db, registrar) => {
    const responsavel = await repository.inserir(dados, db);
    await registrar('criou', `Cadastrou o responsável ${await descrever(responsavel, db)}.`, doResponsavel(responsavel));
    return responsavel;
  });
}

export async function atualizar(id, alteracoes) {
  return atividades.registrando(async (db, registrar) => {
    const responsavel = await repository.atualizar(id, alteracoes, db);
    if (!responsavel) throw naoEncontrado('Responsável', id);
    await registrar('alterou', `Alterou o responsável ${await descrever(responsavel, db)}.`, doResponsavel(responsavel));
    return responsavel;
  });
}

export async function excluir(id) {
  return atividades.registrando(async (db, registrar) => {
    const responsavel = await repository.buscarPorId(id, db);
    if (!responsavel) throw naoEncontrado('Responsável', id);
    const descricao = await descrever(responsavel, db);
    if (!(await repository.excluir(id, db))) throw naoEncontrado('Responsável', id);
    await registrar('excluiu', `Excluiu o responsável ${descricao}.`, doResponsavel(responsavel));
  });
}
