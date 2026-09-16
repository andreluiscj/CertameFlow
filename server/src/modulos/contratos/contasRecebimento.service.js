import { aspas } from '../../util/formatacao.js';
import { exigirTextos, naoEncontrado } from '../../util/validacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './contasRecebimento.repository.js';

export const listar = () => repository.listar();

const atividades = registroDeAtividades('contratos');

const descreverConta = (c) => `${aspas(c.banco)}${c.conta ? ` (conta ${c.conta})` : ''}`;
const daConta = (c) => ({ entidade: 'conta_recebimento', entidadeId: c.id });

export async function criar(dados) {
  exigirTextos(dados, { banco: 'Informe o banco.' });
  return atividades.registrando(async (db, registrar) => {
    const conta = await repository.inserir(dados, db);
    await registrar('criou', `Cadastrou a conta de recebimento ${descreverConta(conta)}.`, daConta(conta));
    return conta;
  });
}

export async function atualizar(id, alteracoes) {
  return atividades.registrando(async (db, registrar) => {
    const conta = await repository.atualizar(id, alteracoes, db);
    if (!conta) throw naoEncontrado('Conta de recebimento', id);
    await registrar('alterou', `Alterou a conta de recebimento ${descreverConta(conta)}.`, daConta(conta));
    return conta;
  });
}

export async function excluir(id) {
  return atividades.registrando(async (db, registrar) => {
    const conta = await repository.buscarPorId(id, db);
    if (!conta || !(await repository.excluir(id, db))) throw naoEncontrado('Conta de recebimento', id);
    await registrar('excluiu', `Excluiu a conta de recebimento ${descreverConta(conta)}.`, daConta(conta));
  });
}
