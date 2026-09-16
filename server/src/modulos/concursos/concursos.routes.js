import { Router } from 'express';
import { assincrono } from '../../middleware/assincrono.js';
import { autenticar } from '../../middleware/autenticacao.js';
import { exigirNivel, exigirNivelParaEscrita } from '../../middleware/autorizacao.js';
import { validarUuid } from '../../middleware/validarUuid.js';
import { rotaDeLogs } from '../logs/atividades.service.js';
import * as controller from './concursos.controller.js';

/**
 * Modulo Concursos.
 *
 * Leitura a partir do nivel 1, escrita a partir do nivel 2. A leitura fica
 * aberta ao nivel 1 porque telas do modulo Contratos (ContratoDetalhesPage,
 * AcompanharContratosPage) listam concursos e o progresso das tarefas. E a
 * mesma excecao aplicada a concurso_cadastros e concurso_eventos em
 * supabase/schema.sql.
 *
 * As demais tabelas do modulo (tipos, status, observacoes, notas de titulos) e
 * os logs exigem nivel 2 tambem para leitura.
 *
 * As regras sao aplicadas no topo do router, entao valem para todas as rotas
 * abaixo e nenhuma fica desprotegida por esquecimento.
 */
export const concursosRoutes = Router();

concursosRoutes.use(assincrono(autenticar));
concursosRoutes.use(exigirNivel(1));
concursosRoutes.use(exigirNivelParaEscrita(2));

concursosRoutes.param('id', validarUuid);

const a = assincrono;
const nivel2 = exigirNivel(2);

// Rotas fixas antes de "/:id", para nao serem lidas como um id.
concursosRoutes.get('/logs', nivel2, a(rotaDeLogs('concursos')));
concursosRoutes.get('/tipos', nivel2, a(controller.tipos));
concursosRoutes.get('/status', nivel2, a(controller.status));

// ----- Tarefas -----
concursosRoutes.get('/eventos', a(controller.listarEventos));
concursosRoutes.get('/eventos-progresso', a(controller.progressoEventos));
concursosRoutes.post('/eventos', a(controller.criarEvento));
concursosRoutes.post('/eventos-conclusoes', a(controller.salvarConclusoes));
concursosRoutes.patch('/eventos/:id', a(controller.atualizarEvento));
concursosRoutes.put('/eventos/:id/conclusao', a(controller.concluirEvento));
concursosRoutes.delete('/eventos/:id', a(controller.excluirEvento));

// ----- Observacoes da agenda -----
// Um mes pode ter varios comentarios, cada um com o seu autor.
concursosRoutes.get('/observacoes/:ano/:mes', nivel2, a(controller.listarObservacoes));
concursosRoutes.post('/observacoes/:ano/:mes', a(controller.criarObservacao));
concursosRoutes.delete('/observacoes/:id', a(controller.excluirObservacao));

// ----- Notas de titulos -----
concursosRoutes.get('/notas-titulos', nivel2, a(controller.listarNotas));
concursosRoutes.put('/notas-titulos', a(controller.salvarNota));
concursosRoutes.patch('/notas-titulos/:id', a(controller.atualizarNota));
concursosRoutes.delete('/notas-titulos/:id', a(controller.excluirNota));

// ----- Concursos -----
concursosRoutes.get('/', a(controller.listar));
concursosRoutes.get('/:id', a(controller.buscar));
concursosRoutes.post('/', a(controller.criar));
concursosRoutes.patch('/:id', a(controller.atualizar));
concursosRoutes.delete('/:id', a(controller.excluir));

// ----- Tarefas e nota de um concurso -----
concursosRoutes.get('/:id/nota-titulo', nivel2, a(controller.notaDoConcurso));
concursosRoutes.put('/:id/eventos/conclusao', a(controller.concluirTodosEventos));
concursosRoutes.post('/:id/eventos/importacoes', a(controller.importarEventos));
concursosRoutes.delete('/:id/eventos', a(controller.excluirEventosDoConcurso));
