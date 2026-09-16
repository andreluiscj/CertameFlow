import { aspas } from '../../util/formatacao.js';
import { exigirTextos } from '../../util/validacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './auxiliares.repository.js';

export const listarTiposProcesso = () => repository.listarTiposProcesso();
export const listarStatus = () => repository.listarStatus();
export const listarStatusParcela = () => repository.listarStatusParcela();
export const listarTiposCliente = () => repository.listarTiposCliente();

const atividades = registroDeAtividades('contratos');

export async function criarTipoCliente(dados) {
  exigirTextos(dados, { nome: 'Informe o nome do tipo.' });
  return atividades.registrando(async (db, registrar) => {
    const tipo = await repository.inserirTipoCliente(dados.nome, db);
    await registrar('criou', `Cadastrou o tipo de cliente ${aspas(tipo.nome)}.`, {
      entidade: 'tipo_cliente',
      entidadeId: tipo.id,
    });
    return tipo;
  });
}
