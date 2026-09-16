import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: vi.fn(async (token) => ({ payload: { sub: token } })),
}));

vi.mock('../src/modulos/usuarios/perfilRepository.js', () => ({
  buscarNivelAcesso: vi.fn(),
}));

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
const USUARIO = '5f0c9f55-1111-4b4b-9a9a-0123456789ab';
const app = criarApp();

function comNivel(nivel, usuario = 'usuario') {
  perfil.buscarNivelAcesso.mockResolvedValue(nivel);
  return `Bearer ${usuario}`;
}

const LEITURAS = [
  '/api/provas/bancos',
  '/api/provas/sexos',
  '/api/provas/niveis',
  '/api/provas/status',
  '/api/provas/areas',
  '/api/provas/cargos',
  '/api/provas/elaboradores',
  '/api/provas/areas-contagem-elaboradores',
  '/api/provas/cadastros-contagem',
  `/api/provas/cadastros/${ID}/disciplina-niveis`,
  `/api/provas/concursos/${ID}/provas`,
  `/api/provas/concursos/${ID}/resumo-financeiro`,
  '/api/provas/encerramentos',
];

beforeEach(() => {
  vi.clearAllMocks();
  pool.query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('controle de acesso do modulo Provas', () => {
  it.each(LEITURAS)('sem token, %s responde 401', async (rota) => {
    expect((await request(app).get(rota)).status).toBe(401);
  });

  it.each(LEITURAS)('com nivel 2, %s responde 403 sem consultar o banco', async (rota) => {
    const resposta = await request(app).get(rota).set('Authorization', comNivel(2));
    expect(resposta.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each(LEITURAS)('com nivel 3, %s responde 200', async (rota) => {
    expect((await request(app).get(rota).set('Authorization', comNivel(3))).status).toBe(200);
  });

  it('importacao tambem exige nivel 3 e nao abre transacao', async () => {
    const resposta = await request(app)
      .post(`/api/provas/concursos/${ID}/importacoes`)
      .set('Authorization', comNivel(2))
      .send({ linhas: [] });
    expect(resposta.status).toBe(403);
    expect(emTransacao).not.toHaveBeenCalled();
  });
});

describe('rotas do modulo Provas', () => {
  it('ids que nao sao UUID respondem 400', async () => {
    for (const [metodo, rota] of [
      ['get', '/api/provas/cadastros/abc'],
      ['patch', '/api/provas/niveis/abc'],
      ['get', '/api/provas/concursos/abc/provas'],
      ['put', '/api/provas/encerramentos/abc'],
    ]) {
      const resposta = await request(app)[metodo](rota).set('Authorization', comNivel(3)).send({});
      expect(resposta.status, rota).toBe(400);
    }
  });

  it('prova inexistente responde 404', async () => {
    const resposta = await request(app).get(`/api/provas/cadastros/${ID}`).set('Authorization', comNivel(3));
    expect(resposta.status).toBe(404);
  });

  it('nivel sem descricao responde 400', async () => {
    const resposta = await request(app)
      .post('/api/provas/niveis')
      .set('Authorization', comNivel(3))
      .send({ valor_questao: 10 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toHaveProperty('descricao');
  });

  it('insere so as colunas enviadas e ignora colunas nao editaveis', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: ID }], rowCount: 1 });
    await request(app)
      .post('/api/provas/niveis')
      .set('Authorization', comNivel(3))
      .send({ descricao: 'Superior', codigo: 999, id: 'forjado' });

    const [sql, valores] = pool.query.mock.calls.at(-1);
    expect(sql).toContain('insert into provas_niveis (descricao) values ($1)');
    expect(valores).toEqual(['Superior']);
  });

  it('certificado grava a emissao em logs com o usuario do token, ignorando o corpo', async () => {
    const atividades = await import('../src/modulos/logs/atividades.repository.js');
    const resposta = await request(app)
      .post('/api/provas/certificados')
      .set('Authorization', comNivel(3, USUARIO))
      .send({
        elaborador_id: ID,
        elaborador_nome: 'Fulano',
        elaborador_cpf: '000.000.000-00',
        emitido_por_id: '99999999-9999-9999-9999-999999999999',
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ elaborador_id: ID });
    expect(atividades.inserir).toHaveBeenCalledWith(pool, {
      modulo: 'provas',
      acao: 'emitiu',
      descricao: 'Emitiu declaração para o elaborador "Fulano".',
      entidade: 'certificado',
      entidadeId: ID,
      usuarioId: USUARIO,
    });
    expect(pool.query.mock.calls.some(([q]) => String(q).includes('certificados_logs'))).toBe(false);
  });

  it('adiciona e remove elaborador de uma area', async () => {
    const adicionar = await request(app)
      .post(`/api/provas/areas/${ID}/elaboradores`)
      .set('Authorization', comNivel(3))
      .send({ elaborador_id: USUARIO });
    expect(adicionar.status).toBe(204);
    expect(pool.query.mock.calls.at(-1)[1]).toEqual([USUARIO, ID]);

    const remover = await request(app)
      .delete(`/api/provas/areas/${ID}/elaboradores/${USUARIO}`)
      .set('Authorization', comNivel(3));
    expect(remover.status).toBe(204);

    const invalido = await request(app)
      .post(`/api/provas/areas/${ID}/elaboradores`)
      .set('Authorization', comNivel(3))
      .send({ elaborador_id: 'abc' });
    expect(invalido.status).toBe(400);
  });

  it('elaboradores para RPA recusa lista de ids invalida', async () => {
    const resposta = await request(app)
      .get('/api/provas/elaboradores-rpa?ids=abc')
      .set('Authorization', comNivel(3));
    expect(resposta.status).toBe(400);
  });
});
