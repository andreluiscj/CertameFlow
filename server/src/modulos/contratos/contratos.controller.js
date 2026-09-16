import * as auxiliares from './auxiliares.service.js';
import * as cadastros from './cadastros.service.js';
import * as clientes from './clientes.service.js';
import * as comprovantes from './comprovantes.service.js';
import * as contas from './contasRecebimento.service.js';
import * as responsaveis from './responsaveis.service.js';

/**
 * Controllers do modulo Contratos, agrupados por recurso. Cada funcao so
 * traduz a requisicao para o service e o resultado para a resposta HTTP; as
 * regras ficam nos services.
 */

// ----- Listas de apoio -----
export const tiposProcesso = async (req, res) => res.json(await auxiliares.listarTiposProcesso());
export const status = async (req, res) => res.json(await auxiliares.listarStatus());
export const statusParcela = async (req, res) => res.json(await auxiliares.listarStatusParcela());
export const tiposCliente = async (req, res) => res.json(await auxiliares.listarTiposCliente());
export const criarTipoCliente = async (req, res) =>
  res.status(201).json(await auxiliares.criarTipoCliente(req.body));

// ----- Contratos -----
export const listarContratos = async (req, res) => res.json(await cadastros.listar());
export const buscarContrato = async (req, res) => res.json(await cadastros.buscarPorId(req.params.id));
export const criarContrato = async (req, res) => res.status(201).json(await cadastros.criar(req.body));
export const excluirContrato = async (req, res) => {
  await cadastros.excluir(req.params.id);
  res.status(204).end();
};
export const vincularConcurso = async (req, res) =>
  res.json(await cadastros.atualizarConcurso(req.params.id, req.body));
export const responsaveisDoContrato = async (req, res) =>
  res.json(await cadastros.listarResponsaveis(req.params.id));
export const substituirResponsaveisDoContrato = async (req, res) =>
  res.json(await cadastros.substituirResponsaveis(req.params.id, req.body?.responsavel_ids));
export const vincularResponsavelAoContrato = async (req, res) => {
  await cadastros.vincularResponsavel(req.params.id, req.body?.responsavel_id);
  res.status(204).end();
};
export const desvincularResponsavelDoContrato = async (req, res) => {
  await cadastros.desvincularResponsavel(req.params.id, req.params.responsavelId);
  res.status(204).end();
};
export const atualizarParcela = async (req, res) =>
  res.json(await cadastros.atualizarParcela(req.params.id, req.body));
export const enviarComprovante = async (req, res) =>
  res.json(await comprovantes.enviar(req.params.id, req.file));
export const linkDoComprovante = async (req, res) => res.json(await comprovantes.gerarLink(req.params.id));
export const removerComprovante = async (req, res) => res.json(await comprovantes.remover(req.params.id));

// ----- Clientes -----
export const listarClientes = async (req, res) => res.json(await clientes.listar());
export const criarCliente = async (req, res) => res.status(201).json(await clientes.criar(req.body));
export const atualizarCliente = async (req, res) =>
  res.json(await clientes.atualizar(req.params.id, req.body));
export const excluirCliente = async (req, res) => {
  await clientes.excluir(req.params.id);
  res.status(204).end();
};
export const substituirResponsaveisDoCliente = async (req, res) =>
  res.json(await clientes.substituirResponsaveis(req.params.id, req.body?.responsaveis));

// ----- Responsaveis -----
export const listarResponsaveis = async (req, res) =>
  res.json(await responsaveis.listar(req.query.cliente_id));
export const criarResponsavel = async (req, res) =>
  res.status(201).json(await responsaveis.criar(req.body));
export const atualizarResponsavel = async (req, res) =>
  res.json(await responsaveis.atualizar(req.params.id, req.body));
export const excluirResponsavel = async (req, res) => {
  await responsaveis.excluir(req.params.id);
  res.status(204).end();
};
export const contratosDoResponsavel = async (req, res) =>
  res.json(await responsaveis.listarContratos(req.params.id));

// ----- Contas de recebimento -----
export const listarContas = async (req, res) => res.json(await contas.listar());
export const criarConta = async (req, res) => res.status(201).json(await contas.criar(req.body));
export const atualizarConta = async (req, res) =>
  res.json(await contas.atualizar(req.params.id, req.body));
export const excluirConta = async (req, res) => {
  await contas.excluir(req.params.id);
  res.status(204).end();
};
