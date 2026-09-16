import { Router } from 'express';
import { assincrono } from '../../middleware/assincrono.js';
import { autenticar } from '../../middleware/autenticacao.js';
import { exigirModulo } from '../../middleware/autorizacao.js';
import { validarUuid } from '../../middleware/validarUuid.js';
import { rotaDeLogs } from '../logs/atividades.service.js';
import * as c from './provas.controller.js';

/**
 * Modulo Provas: exige o modulo Provas em todas as rotas, para leitura e
 * escrita, como em supabase/schema.sql.
 *
 * Um unico router (sem sub-routers) para que os router.param abaixo valham
 * para todas as rotas.
 */
export const provasRoutes = Router();

provasRoutes.use(assincrono(autenticar));
provasRoutes.use(exigirModulo('provas'));

provasRoutes.param('id', validarUuid);
provasRoutes.param('concursoId', validarUuid);
provasRoutes.param('elaboradorId', validarUuid);

const a = assincrono;

provasRoutes.get('/logs', a(rotaDeLogs('provas')));

// ----- Listas fixas -----
provasRoutes.get('/bancos', a(c.bancos));
provasRoutes.get('/sexos', a(c.sexos));

// ----- Cadastros de apoio -----
for (const [caminho, controller] of [
  ['/niveis', c.niveis],
  ['/status', c.status],
  ['/areas', c.areas],
  ['/cargos', c.cargos],
  ['/elaboradores', c.elaboradoresCrud],
]) {
  provasRoutes.get(caminho, a(controller.listar));
  provasRoutes.post(caminho, a(controller.criar));
  provasRoutes.patch(`${caminho}/:id`, a(controller.atualizar));
  provasRoutes.delete(`${caminho}/:id`, a(controller.excluir));
}

provasRoutes.get('/areas-contagem-elaboradores', a(c.contagemElaboradoresPorArea));
provasRoutes.post('/areas-importacoes', a(c.importarAreas));
provasRoutes.post('/areas/:id/elaboradores', a(c.vincularElaboradorArea));
provasRoutes.delete('/areas/:id/elaboradores/:elaboradorId', a(c.desvincularElaboradorArea));
provasRoutes.post('/elaboradores-importacoes', a(c.importarElaboradores));
provasRoutes.get('/elaboradores-rpa', a(c.elaboradoresParaRpa));

// ----- Provas -----
provasRoutes.get('/cadastros-contagem', a(c.contagemPorConcurso));
provasRoutes.get('/cadastros/:id', a(c.buscarProva));
provasRoutes.delete('/cadastros/:id', a(c.excluirProva));
provasRoutes.get('/cadastros/:id/disciplina-niveis', a(c.disciplinaNiveisDaProva));
provasRoutes.patch('/disciplina-niveis/:id', a(c.atualizarDisciplinaNivel));

// ----- Por concurso -----
provasRoutes.get('/concursos/:concursoId/provas', a(c.provasDoConcurso));
provasRoutes.get('/concursos/:concursoId/resumo-financeiro', a(c.resumoFinanceiro));
provasRoutes.post('/concursos/:concursoId/importacoes', a(c.importarProvas));
provasRoutes.get('/concursos/:concursoId/rpa', a(c.baseRpa));

// ----- Encerramentos -----
provasRoutes.get('/encerramentos', a(c.encerramentos));
provasRoutes.put('/encerramentos/:concursoId', a(c.encerrar));
provasRoutes.delete('/encerramentos/:concursoId', a(c.reabrir));

// ----- Certificados -----
provasRoutes.post('/certificados', a(c.registrarCertificado));
