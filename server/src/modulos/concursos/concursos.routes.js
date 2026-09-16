import { Router } from 'express';
import { assincrono } from '../../middleware/assincrono.js';
import { autenticar } from '../../middleware/autenticacao.js';
import { exigirModulo, exigirModuloParaEscrita } from '../../middleware/autorizacao.js';
import { validarUuid } from '../../middleware/validarUuid.js';
import { rotaDeLogs } from '../logs/atividades.service.js';
import * as controller from './concursos.controller.js';

/**
 * Modulo Concursos.
 *
 * A lista de concursos e as tarefas podem ser lidas por quem tem qualquer
 * modulo, porque Contratos (vinculo e progresso do concurso) e Provas (provas
 * por concurso, calendario) exibem esses dados. E a mesma excecao aplicada a
 * concurso_cadastros e concurso_eventos em supabase/schema.sql.
 *
 * Escrever, e ler as demais tabelas do modulo (tipos, status, observacoes,
 * notas de titulos) e os logs, exige o modulo Concursos.
 *
 * As regras sao aplicadas no topo do router, entao valem para todas as rotas
 * abaixo e nenhuma fica desprotegida por esquecimento.
 */
export const concursosRoutes = Router();

concursosRoutes.use(assincrono(autenticar));
concursosRoutes.use(exigirModulo('concursos', 'contratos', 'provas'));
concursosRoutes.use(exigirModuloParaEscrita('concursos'));

concursosRoutes.param('id', validarUuid);

const a = assincrono;
const soConcursos = exigirModulo('concursos');

// Rotas fixas antes de "/:id", para nao serem lidas como um id.
concursosRoutes.get('/logs', soConcursos, a(rotaDeLogs('concursos')));
concursosRoutes.get('/tipos', soConcursos, a(controller.tipos));
concursosRoutes.get('/status', soConcursos, a(controller.status));

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
concursosRoutes.get('/observacoes/:ano/:mes', soConcursos, a(controller.listarObservacoes));
concursosRoutes.post('/observacoes/:ano/:mes', a(controller.criarObservacao));
concursosRoutes.delete('/observacoes/:id', a(controller.excluirObservacao));

// ----- Notas de titulos -----
concursosRoutes.get('/notas-titulos', soConcursos, a(controller.listarNotas));
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
concursosRoutes.get('/:id/nota-titulo', soConcursos, a(controller.notaDoConcurso));
concursosRoutes.put('/:id/eventos/conclusao', a(controller.concluirTodosEventos));
concursosRoutes.post('/:id/eventos/importacoes', a(controller.importarEventos));
concursosRoutes.delete('/:id/eventos', a(controller.excluirEventosDoConcurso));
