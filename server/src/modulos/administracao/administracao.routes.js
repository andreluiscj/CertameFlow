import { Router } from 'express';
import { assincrono } from '../../middleware/assincrono.js';
import { autenticar } from '../../middleware/autenticacao.js';
import { exigirAdministrador } from '../../middleware/autorizacao.js';
import { validarUuid } from '../../middleware/validarUuid.js';
import { rotaDeLogs } from '../logs/atividades.service.js';
import * as c from './administracao.controller.js';

/**
 * Administracao: exige o nivel 4 (administrador) em todas as rotas, para
 * leitura e escrita.
 * Nao e um modulo de negocio; reune a gestao de usuarios e das notificacoes.
 */
export const administracaoRoutes = Router();

administracaoRoutes.use(assincrono(autenticar));
administracaoRoutes.use(exigirAdministrador());

administracaoRoutes.param('id', validarUuid);

const a = assincrono;

administracaoRoutes.get('/logs', a(rotaDeLogs('administracao')));

administracaoRoutes.get('/usuarios', a(c.listarUsuarios));
administracaoRoutes.post('/usuarios', a(c.criarUsuario));
administracaoRoutes.patch('/usuarios/:id', a(c.atualizarUsuario));
administracaoRoutes.put('/usuarios/:id/senha', a(c.redefinirSenha));
administracaoRoutes.delete('/usuarios/:id', a(c.excluirUsuario));

administracaoRoutes.get('/notificacoes', a(c.situacaoNotificacoes));
administracaoRoutes.post('/notificacoes/envios', a(c.enviarNotificacoes));
