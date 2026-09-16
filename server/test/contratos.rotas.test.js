import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: vi.fn(async (token) => ({ payload: { sub: token } })),
}));

vi.mock('../src/modulos/usuarios/perfilRepository.js', () => ({
  buscarAcesso: vi.fn(),
}));

// O banco inteiro e simulado: toda consulta devolve uma lista vazia.
vi.mock('../src/config/db.js', () => {
  const pool = { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) };
  // A transacao usa a mesma conexao simulada do pool.
  return { pool, emTransacao: vi.fn((trabalho) => trabalho(pool)) };
});

// O registro de atividades e conferido em teste proprio; aqui so e simulado.
vi.mock('../src/modulos/logs/atividades.repository.js', () => ({
  inserir: vi.fn(),
  listar: vi.fn(async () => []),
}));

const { criarApp } = await import('../src/app.js');
const perfil = await import('../src/modulos/usuarios/perfilRepository.js');
const { pool, emTransacao } = await import('../src/config/db.js');

const ID = '08a11b5f-95b3-43d0-af8b-02d66decc626';
const app = criarApp();

/** Token simulado de um usuario com os modulos informados (nivel 4 = administrador). */
function comAcesso(modulos, nivelAcesso = 0) {
  perfil.buscarAcesso.mockResolvedValue({ nivelAcesso, modulos });
  return `Bearer usuario-${modulos.join('-') || 'sem-modulos'}-${nivelAcesso}`;
}

const LEITURAS = [
  '/api/contratos/cadastros',
  `/api/contratos/cadastros/${ID}/responsaveis`,
  '/api/contratos/clientes',
  '/api/contratos/clientes-tipos',
  '/api/contratos/responsaveis',
  `/api/contratos/responsaveis/${ID}/contratos`,
  '/api/contratos/contas-recebimento',
  '/api/contratos/tipos-processo',
  '/api/contratos/status',
  '/api/contratos/parcela-status',
];

beforeEach(() => {
  vi.clearAllMocks();
  pool.query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('controle de acesso do modulo Contratos', () => {
  it.each(LEITURAS)('sem token, %s responde 401', async (rota) => {
    const resposta = await request(app).get(rota);
    expect(resposta.status).toBe(401);
  });

  it.each(LEITURAS)('sem modulos, %s responde 403 sem consultar o banco', async (rota) => {
    const resposta = await request(app).get(rota).set('Authorization', comAcesso([]));
    expect(resposta.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each(LEITURAS)('com o modulo Contratos, %s responde 200', async (rota) => {
    const resposta = await request(app).get(rota).set('Authorization', comAcesso(['contratos']));
    expect(resposta.status).toBe(200);
  });

  it.each(LEITURAS)('com Concursos e Provas, mas sem Contratos, %s responde 403', async (rota) => {
    const resposta = await request(app).get(rota).set('Authorization', comAcesso(['concursos', 'provas']));
    expect(resposta.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('administrador acessa mesmo sem modulos marcados', async () => {
    const resposta = await request(app).get('/api/contratos/cadastros').set('Authorization', comAcesso([], 4));
    expect(resposta.status).toBe(200);
  });

  it('escrita tambem exige o modulo Contratos', async () => {
    const resposta = await request(app)
      .delete(`/api/contratos/cadastros/${ID}`)
      .set('Authorization', comAcesso([]));
    expect(resposta.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('rotas do modulo Contratos', () => {
  it('contrato inexistente responde 404', async () => {
    const resposta = await request(app)
      .get(`/api/contratos/cadastros/${ID}`)
      .set('Authorization', comAcesso(['contratos']));
    expect(resposta.status).toBe(404);
  });

  it('id que nao e UUID responde 400 tambem nos sub-recursos', async () => {
    for (const rota of [
      '/api/contratos/cadastros/abc',
      '/api/contratos/clientes/abc',
      '/api/contratos/responsaveis/abc/contratos',
      '/api/contratos/contas-recebimento/abc',
    ]) {
      const metodo = rota.endsWith('/contratos') || rota.includes('/cadastros/') ? 'get' : 'patch';
      const resposta = await request(app)[metodo](rota).set('Authorization', comAcesso(['contratos'])).send({});
      expect(resposta.status, rota).toBe(400);
    }
  });

  it('desvincular responsavel responde 204 e valida os dois ids', async () => {
    const ok = await request(app)
      .delete(`/api/contratos/cadastros/${ID}/responsaveis/${ID}`)
      .set('Authorization', comAcesso(['contratos']));
    expect(ok.status).toBe(204);

    const invalido = await request(app)
      .delete(`/api/contratos/cadastros/${ID}/responsaveis/abc`)
      .set('Authorization', comAcesso(['contratos']));
    expect(invalido.status).toBe(400);
  });

  it('vincular responsavel em contrato inexistente responde 404', async () => {
    const resposta = await request(app)
      .post(`/api/contratos/cadastros/${ID}/responsaveis`)
      .set('Authorization', comAcesso(['contratos']))
      .send({ responsavel_id: ID });
    expect(resposta.status).toBe(404);
  });

  it('cadastro de contrato invalido responde 400 sem abrir transacao', async () => {
    const resposta = await request(app)
      .post('/api/contratos/cadastros')
      .set('Authorization', comAcesso(['contratos']))
      .send({ valor_total: 100, parcelas: [] });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toHaveProperty('cliente_id');
    expect(emTransacao).not.toHaveBeenCalled();
  });

  it('excluir cliente com contratos responde 409, e nao 500', async () => {
    pool.query.mockRejectedValue(
      Object.assign(new Error('violates foreign key constraint'), {
        code: '23503',
        detail: `Key (id)=(${ID}) is still referenced from table "contrato_cadastros".`,
      }),
    );
    const resposta = await request(app)
      .delete(`/api/contratos/clientes/${ID}`)
      .set('Authorization', comAcesso(['contratos']));
    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem).not.toContain('contrato_cadastros');
  });

  it('nome de tipo repetido responde 409', async () => {
    pool.query.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));
    const resposta = await request(app)
      .post('/api/contratos/clientes-tipos')
      .set('Authorization', comAcesso(['contratos']))
      .send({ nome: 'Prefeitura' });
    expect(resposta.status).toBe(409);
  });
});
