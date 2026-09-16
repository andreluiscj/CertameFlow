import * as complementos from './complementos.service.js';
import * as service from './concursos.service.js';
import * as eventos from './eventos.service.js';

export async function listar(req, res) {
  res.json(await service.listar());
}

export async function buscar(req, res) {
  res.json(await service.buscarPorId(req.params.id));
}

export async function criar(req, res) {
  res.status(201).json(await service.criar(req.body));
}

export async function atualizar(req, res) {
  res.json(await service.atualizar(req.params.id, req.body));
}

export async function excluir(req, res) {
  await service.excluir(req.params.id);
  res.status(204).end();
}

// ----- Tarefas (eventos) -----

const semConteudo = (res) => res.status(204).end();

export const listarEventos = async (req, res) => res.json(await eventos.listar(req.query.concurso_id));
export const progressoEventos = async (req, res) => res.json(await eventos.progresso(req.query.ids));
export const criarEvento = async (req, res) => res.status(201).json(await eventos.criar(req.body));
export const atualizarEvento = async (req, res) => res.json(await eventos.atualizar(req.params.id, req.body));
export const excluirEvento = async (req, res) => {
  await eventos.excluir(req.params.id);
  semConteudo(res);
};
export const concluirEvento = async (req, res) => res.json(await eventos.definirConcluida(req.params.id, req.body));
export const salvarConclusoes = async (req, res) => res.json(await eventos.salvarConclusoes(req.body));
export const concluirTodosEventos = async (req, res) =>
  res.json(await eventos.definirTodasConcluidas(req.params.id, req.body));
export const excluirEventosDoConcurso = async (req, res) => res.json(await eventos.excluirDoConcurso(req.params.id));
export const importarEventos = async (req, res) =>
  res.status(201).json(await eventos.importar(req.params.id, req.body));

// ----- Complementos -----
export const tipos = async (req, res) => res.json(await complementos.listarTipos());
export const status = async (req, res) => res.json(await complementos.listarStatus());
export const listarObservacoes = async (req, res) =>
  res.json(await complementos.listarObservacoes(req.params.ano, req.params.mes));
export const criarObservacao = async (req, res) =>
  res.status(201).json(await complementos.criarObservacao(req.params.ano, req.params.mes, req.body));
export const excluirObservacao = async (req, res) => {
  await complementos.excluirObservacao(req.params.id);
  semConteudo(res);
};
export const listarNotas = async (req, res) => res.json(await complementos.listarNotas());
export const notaDoConcurso = async (req, res) => res.json(await complementos.buscarNotaDoConcurso(req.params.id));
export const salvarNota = async (req, res) => res.json(await complementos.salvarNota(req.body));
export const atualizarNota = async (req, res) => res.json(await complementos.atualizarNota(req.params.id, req.body));
export const excluirNota = async (req, res) => {
  await complementos.excluirNota(req.params.id);
  semConteudo(res);
};
