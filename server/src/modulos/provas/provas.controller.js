import * as apoio from './apoio.service.js';
import * as elaboradores from './elaboradores.service.js';
import * as provas from './provas.service.js';

/**
 * Controllers do modulo Provas: so traduzem requisicao e resposta. As regras
 * ficam nos services.
 */

const semConteudo = (res) => res.status(204).end();

/** Listar, criar, alterar e excluir de um cadastro de apoio. */
function crud(service) {
  return {
    listar: async (req, res) => res.json(await service.listar()),
    criar: async (req, res) => res.status(201).json(await service.criar(req.body)),
    atualizar: async (req, res) => res.json(await service.atualizar(req.params.id, req.body)),
    excluir: async (req, res) => {
      await service.excluir(req.params.id);
      semConteudo(res);
    },
  };
}

export const niveis = crud(apoio.niveis);
export const status = crud(apoio.status);
export const areas = crud(apoio.areas);
export const cargos = crud(apoio.cargos);
export const elaboradoresCrud = crud(elaboradores);

// ----- Listas e apoio -----
export const bancos = async (req, res) => res.json(await apoio.listarBancos());
export const sexos = async (req, res) => res.json(await apoio.listarSexos());
export const contagemElaboradoresPorArea = async (req, res) =>
  res.json(await apoio.contarElaboradoresPorArea());
export const vincularElaboradorArea = async (req, res) => {
  await apoio.vincularElaboradorArea(req.params.id, req.body);
  semConteudo(res);
};
export const desvincularElaboradorArea = async (req, res) => {
  await apoio.desvincularElaboradorArea(req.params.id, req.params.elaboradorId);
  semConteudo(res);
};
export const importarAreas = async (req, res) => res.status(201).json(await apoio.importarAreas(req.body));

// ----- Elaboradores -----
export const importarElaboradores = async (req, res) =>
  res.status(201).json(await elaboradores.importar(req.body));
export const elaboradoresParaRpa = async (req, res) =>
  res.json(await elaboradores.listarParaRpa(req.query.ids));

// ----- Provas -----
export const buscarProva = async (req, res) => res.json(await provas.buscarCompleta(req.params.id));
export const excluirProva = async (req, res) => {
  await provas.excluir(req.params.id);
  semConteudo(res);
};
export const disciplinaNiveisDaProva = async (req, res) =>
  res.json(await provas.listarDisciplinaNiveis(req.params.id));
export const atualizarDisciplinaNivel = async (req, res) =>
  res.json(await provas.atualizarDisciplinaNivel(req.params.id, req.body));
export const contagemPorConcurso = async (req, res) => res.json(await provas.contarPorConcurso());

// ----- Por concurso -----
export const provasDoConcurso = async (req, res) =>
  res.json(await provas.listarPorConcurso(req.params.concursoId));
export const resumoFinanceiro = async (req, res) =>
  res.json(await provas.listarResumoFinanceiro(req.params.concursoId));
export const importarProvas = async (req, res) =>
  res.status(201).json(await provas.importar(req.params.concursoId, req.body));
export const baseRpa = async (req, res) => res.json(await provas.buscarBaseRpa(req.params.concursoId));

// ----- Encerramentos -----
export const encerramentos = async (req, res) => res.json(await provas.listarEncerramentos());
export const encerrar = async (req, res) => res.json(await provas.encerrar(req.params.concursoId));
export const reabrir = async (req, res) => {
  await provas.reabrir(req.params.concursoId);
  semConteudo(res);
};

// ----- Certificados -----
export const registrarCertificado = async (req, res) =>
  res.status(201).json(await provas.registrarCertificado(req.body));
