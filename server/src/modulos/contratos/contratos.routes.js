import { Router } from 'express';
import { assincrono } from '../../middleware/assincrono.js';
import { autenticar } from '../../middleware/autenticacao.js';
import { exigirModulo } from '../../middleware/autorizacao.js';
import { receberArquivo } from '../../middleware/receberArquivo.js';
import { validarUuid } from '../../middleware/validarUuid.js';
import { rotaDeLogs } from '../logs/atividades.service.js';
import { TAMANHO_MAXIMO } from './comprovantes.service.js';
import * as c from './contratos.controller.js';

/**
 * Modulo Contratos: exige o modulo Contratos em todas as rotas.
 *
 * A autenticacao e o modulo sao conferidos no router principal, antes de montar
 * os sub-routers, entao valem para tudo o que esta abaixo.
 */
export const contratosRoutes = Router();

contratosRoutes.use(assincrono(autenticar));
contratosRoutes.use(exigirModulo('contratos'));

// Um router por recurso. O validarUuid e registrado em cada um porque o
// router.param do Express nao e herdado pelos sub-routers.
function recurso() {
  const router = Router();
  router.param('id', validarUuid);
  return router;
}

contratosRoutes.get('/logs', assincrono(rotaDeLogs('contratos')));

// ----- Listas de apoio -----
contratosRoutes.get('/tipos-processo', assincrono(c.tiposProcesso));
contratosRoutes.get('/status', assincrono(c.status));
contratosRoutes.get('/parcela-status', assincrono(c.statusParcela));
contratosRoutes.get('/clientes-tipos', assincrono(c.tiposCliente));
contratosRoutes.post('/clientes-tipos', assincrono(c.criarTipoCliente));

// ----- Contratos -----
const cadastros = recurso();
cadastros.param('responsavelId', validarUuid);
cadastros.get('/', assincrono(c.listarContratos));
cadastros.post('/', assincrono(c.criarContrato));
cadastros.get('/:id', assincrono(c.buscarContrato));
cadastros.delete('/:id', assincrono(c.excluirContrato));
cadastros.patch('/:id/concurso', assincrono(c.vincularConcurso));
cadastros.get('/:id/responsaveis', assincrono(c.responsaveisDoContrato));
cadastros.put('/:id/responsaveis', assincrono(c.substituirResponsaveisDoContrato));
cadastros.post('/:id/responsaveis', assincrono(c.vincularResponsavelAoContrato));
cadastros.delete('/:id/responsaveis/:responsavelId', assincrono(c.desvincularResponsavelDoContrato));
contratosRoutes.use('/cadastros', cadastros);

const parcelas = recurso();
parcelas.patch('/:id', assincrono(c.atualizarParcela));
parcelas.post('/:id/comprovante', receberArquivo('arquivo', TAMANHO_MAXIMO), assincrono(c.enviarComprovante));
parcelas.get('/:id/comprovante', assincrono(c.linkDoComprovante));
parcelas.delete('/:id/comprovante', assincrono(c.removerComprovante));
contratosRoutes.use('/parcelas', parcelas);

// ----- Clientes -----
const clientes = recurso();
clientes.get('/', assincrono(c.listarClientes));
clientes.post('/', assincrono(c.criarCliente));
clientes.patch('/:id', assincrono(c.atualizarCliente));
clientes.delete('/:id', assincrono(c.excluirCliente));
clientes.put('/:id/responsaveis', assincrono(c.substituirResponsaveisDoCliente));
contratosRoutes.use('/clientes', clientes);

// ----- Responsaveis -----
const responsaveis = recurso();
responsaveis.get('/', assincrono(c.listarResponsaveis));
responsaveis.post('/', assincrono(c.criarResponsavel));
responsaveis.patch('/:id', assincrono(c.atualizarResponsavel));
responsaveis.delete('/:id', assincrono(c.excluirResponsavel));
responsaveis.get('/:id/contratos', assincrono(c.contratosDoResponsavel));
contratosRoutes.use('/responsaveis', responsaveis);

// ----- Contas de recebimento -----
const contas = recurso();
contas.get('/', assincrono(c.listarContas));
contas.post('/', assincrono(c.criarConta));
contas.patch('/:id', assincrono(c.atualizarConta));
contas.delete('/:id', assincrono(c.excluirConta));
contratosRoutes.use('/contas-recebimento', contas);
