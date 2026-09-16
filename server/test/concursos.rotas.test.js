import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Simula apenas o que e externo: a verificacao criptografica do token e o
// banco. Os middlewares de autenticacao e autorizacao rodam de verdade.
vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: vi.fn(async (token) => {
    if (token === 'token-invalido') throw new Error('assinatura invalida');
    return { payload: { sub: token } };
  }),
}));

vi.mock('../src/modulos/usuarios/perfilRepository.js', () => ({
  buscarAcesso: vi.fn(),
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

vi.mock('../src/modulos/concursos/concursos.repository.js', () => ({
  listar: vi.fn(),
  buscarPorId: vi.fn(),
  inserir: vi.fn(),
  atualizar: vi.fn(),
  excluir: vi.fn(),
}));

const { criarApp } = await import('../src/app.js');
const perfil = await import('../src/modulos/usuarios/perfilRepository.js');
const repository = await import('../src/modulos/concursos/concursos.repository.js');
const logs = await import('../src/modulos/logs/atividades.repository.js');
const { pool } = await import('../src/config/db.js');

const ID = '08a11b5f-95b3-43d0-af8b-02d66decc626';
const app = criarApp();

/** Token simulado de um usuario com os modulos informados (nivel 4 = administrador). */
function comAcesso(modulos, nivelAcesso = 0) {
  perfil.buscarAcesso.mockResolvedValue({ nivelAcesso, modulos });
  return `Bearer usuario-${modulos.join('-') || 'sem-modulos'}-${nivelAcesso}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('controle de acesso do modulo Concursos', () => {
  it('sem token, responde 401', async () => {
    const resposta = await request(app).get('/api/concursos');
    expect(resposta.status).toBe(401);
    expect(repository.listar).not.toHaveBeenCalled();
  });

  it('com token de assinatura invalida, responde 401', async () => {
    const resposta = await request(app)
      .get('/api/concursos')
      .set('Authorization', 'Bearer token-invalido');
    expect(resposta.status).toBe(401);
  });

  it('usuario sem modulos nao le, e o banco nao e consultado', async () => {
    const resposta = await request(app).get('/api/concursos').set('Authorization', comAcesso([]));
    expect(resposta.status).toBe(403);
    expect(repository.listar).not.toHaveBeenCalled();
  });

  it('quem so tem Contratos le a lista, porque a tela de detalhes do contrato precisa dela', async () => {
    repository.listar.mockResolvedValue([{ id: ID, nome: 'Concurso teste' }]);
    const resposta = await request(app).get('/api/concursos').set('Authorization', comAcesso(['contratos']));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([{ id: ID, nome: 'Concurso teste' }]);
  });

  it('quem so tem Contratos le um concurso especifico', async () => {
    repository.buscarPorId.mockResolvedValue({ id: ID });
    const resposta = await request(app)
      .get(`/api/concursos/${ID}`)
      .set('Authorization', comAcesso(['contratos']));
    expect(resposta.status).toBe(200);
  });

  it.each([
    ['post', '/api/concursos', 'inserir'],
    ['patch', `/api/concursos/${ID}`, 'atualizar'],
    ['delete', `/api/concursos/${ID}`, 'excluir'],
  ])('quem so tem Contratos nao escreve: %s responde 403 sem tocar no banco', async (metodo, rota, funcao) => {
    const resposta = await request(app)[metodo](rota)
      .set('Authorization', comAcesso(['contratos']))
      .send({ nome: 'x' });
    expect(resposta.status).toBe(403);
    expect(repository[funcao]).not.toHaveBeenCalled();
  });

  it('quem tem Concursos escreve', async () => {
    repository.buscarPorId.mockResolvedValue({ id: ID, nome: 'Antigo' });
    repository.atualizar.mockResolvedValue({ id: ID, nome: 'Alterado' });
    const resposta = await request(app)
      .patch(`/api/concursos/${ID}`)
      .set('Authorization', comAcesso(['concursos']))
      .send({ nome: 'Alterado' });
    expect(resposta.status).toBe(200);
  });

  it('falha do banco ao ler o acesso responde 500, e nao 401', async () => {
    perfil.buscarAcesso.mockRejectedValue(new Error('conexao recusada'));
    const resposta = await request(app)
      .get('/api/concursos')
      .set('Authorization', 'Bearer qualquer-usuario');
    expect(resposta.status).toBe(500);
  });
});

describe('acesso por modulo em Concursos', () => {
  it('quem so tem Provas le a lista de concursos e as tarefas', async () => {
    repository.listar.mockResolvedValue([]);
    const lista = await request(app).get('/api/concursos').set('Authorization', comAcesso(['provas']));
    const tarefas = await request(app).get('/api/concursos/eventos').set('Authorization', comAcesso(['provas']));
    expect(lista.status).toBe(200);
    expect(tarefas.status).toBe(200);
  });

  it.each(['/api/concursos/tipos', '/api/concursos/status', '/api/concursos/notas-titulos', '/api/concursos/logs'])(
    'sem o modulo Concursos, %s responde 403 mesmo com os outros dois modulos',
    async (rota) => {
      const resposta = await request(app).get(rota).set('Authorization', comAcesso(['contratos', 'provas']));
      expect(resposta.status).toBe(403);
    },
  );

  it('quem tem so Concursos le tipos e status', async () => {
    const resposta = await request(app).get('/api/concursos/tipos').set('Authorization', comAcesso(['concursos']));
    expect(resposta.status).toBe(200);
  });

  it('administrador escreve mesmo sem modulos marcados', async () => {
    repository.buscarPorId.mockResolvedValue({ id: ID, nome: 'Antigo' });
    repository.atualizar.mockResolvedValue({ id: ID, nome: 'Alterado' });
    const resposta = await request(app)
      .patch(`/api/concursos/${ID}`)
      .set('Authorization', comAcesso([], 4))
      .send({ nome: 'Alterado' });
    expect(resposta.status).toBe(200);
  });
});

describe('rotas do modulo Concursos', () => {
  it('id que nao e UUID responde 400', async () => {
    const resposta = await request(app)
      .get('/api/concursos/abc')
      .set('Authorization', comAcesso(['concursos']));
    expect(resposta.status).toBe(400);
    expect(repository.buscarPorId).not.toHaveBeenCalled();
  });

  it('concurso inexistente responde 404', async () => {
    repository.buscarPorId.mockResolvedValue(null);
    const resposta = await request(app)
      .get(`/api/concursos/${ID}`)
      .set('Authorization', comAcesso(['concursos']));
    expect(resposta.status).toBe(404);
  });

  it('criacao sem campos obrigatorios responde 400 com a lista de campos', async () => {
    const resposta = await request(app)
      .post('/api/concursos')
      .set('Authorization', comAcesso(['concursos']))
      .send({ nome: 'Sem o resto', uf: 'MGX' });
    expect(resposta.status).toBe(400);
    expect(Object.keys(resposta.body.campos).sort()).toEqual(
      ['cidade', 'concurso_id', 'tipo', 'uf'].sort(),
    );
    expect(repository.inserir).not.toHaveBeenCalled();
  });

  it('criacao valida responde 201', async () => {
    const dados = {
      concurso_id: '01/2026',
      nome: 'Teste',
      tipo: 'Público',
      uf: 'MG',
      cidade: 'Montes Claros',
    };
    repository.inserir.mockResolvedValue({ id: ID, ...dados });
    const resposta = await request(app)
      .post('/api/concursos')
      .set('Authorization', comAcesso(['concursos']))
      .send(dados);
    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBe(ID);
  });

  it('exclusao responde 204', async () => {
    repository.buscarPorId.mockResolvedValue({ id: ID, nome: 'Teste', concurso_id: '01' });
    repository.excluir.mockResolvedValue(true);
    const resposta = await request(app)
      .delete(`/api/concursos/${ID}`)
      .set('Authorization', comAcesso(['concursos']));
    expect(resposta.status).toBe(204);
  });

  it('registra quem alterou, com o usuario do token e so o que mudou', async () => {
    repository.buscarPorId.mockResolvedValue({ id: ID, nome: 'Teste', status: 'Em andamento', cor: '#fff' });
    repository.atualizar.mockResolvedValue({ id: ID, nome: 'Teste', status: 'Finalizado', cor: '#fff' });

    await request(app)
      .patch(`/api/concursos/${ID}`)
      .set('Authorization', comAcesso(['concursos']))
      .send({ status: 'Finalizado' });

    expect(logs.inserir).toHaveBeenCalledTimes(1);
    const [, registro] = logs.inserir.mock.calls[0];
    expect(registro).toMatchObject({
      modulo: 'concursos',
      acao: 'finalizou',
      entidade: 'concurso',
      entidadeId: ID,
      usuarioId: 'usuario-concursos-0',
    });
    expect(registro.descricao).toContain('status de "Em andamento" para "Finalizado"');
  });

  it('logs do modulo exigem nivel 2', async () => {
    const nivel1 = await request(app).get('/api/concursos/logs').set('Authorization', comAcesso(['contratos']));
    expect(nivel1.status).toBe(403);
    const nivel2 = await request(app).get('/api/concursos/logs').set('Authorization', comAcesso(['concursos']));
    expect(nivel2.status).toBe(200);
    expect(logs.listar).toHaveBeenCalledWith('concursos', 500);
  });
});

describe('observacoes da agenda', () => {
  it('grava cada comentario com o autor do token, ignorando o corpo', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: ID, ano: 2026, mes: 9, conteudo: 'Revisar edital' }], rowCount: 1 });
    const resposta = await request(app)
      .post('/api/concursos/observacoes/2026/9')
      .set('Authorization', comAcesso(['concursos']))
      .send({ conteudo: '  Revisar edital  ', usuario_id: 'forjado', usuario_nome: 'Outra pessoa' });

    expect(resposta.status).toBe(201);
    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('insert into concurso_observacoes (ano, mes, conteudo, usuario_id, usuario_nome)');
    expect(valores).toEqual([2026, 9, 'Revisar edital', 'usuario-concursos-0']);
  });

  it('recusa comentario vazio e mes invalido', async () => {
    const vazio = await request(app)
      .post('/api/concursos/observacoes/2026/9')
      .set('Authorization', comAcesso(['concursos']))
      .send({ conteudo: '   ' });
    expect(vazio.status).toBe(400);

    const mesInvalido = await request(app)
      .get('/api/concursos/observacoes/2026/13')
      .set('Authorization', comAcesso(['concursos']));
    expect(mesInvalido.status).toBe(400);
  });

  it('exclui um comentario pelo id e responde 404 quando nao existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: ID, ano: 2026, mes: 9, usuario_nome: 'André' }], rowCount: 1 });
    const excluido = await request(app).delete(`/api/concursos/observacoes/${ID}`).set('Authorization', comAcesso(['concursos']));
    expect(excluido.status).toBe(204);
    expect(pool.query.mock.calls[0][1]).toEqual([ID]);

    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const inexistente = await request(app).delete(`/api/concursos/observacoes/${ID}`).set('Authorization', comAcesso(['concursos']));
    expect(inexistente.status).toBe(404);
  });
});
