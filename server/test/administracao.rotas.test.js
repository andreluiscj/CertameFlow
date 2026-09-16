import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: vi.fn(async (token) => ({ payload: { sub: token } })),
}));

vi.mock('../src/modulos/usuarios/perfilRepository.js', () => ({
  buscarAcesso: vi.fn(),
}));

vi.mock('../src/config/db.js', () => {
  const pool = { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) };
  return { pool, emTransacao: vi.fn((trabalho) => trabalho(pool)) };
});

vi.mock('../src/modulos/logs/atividades.repository.js', () => ({
  inserir: vi.fn(),
  listar: vi.fn(async () => []),
}));

// Supabase Auth simulado: a API nunca fala com o Supabase real nos testes.
const authAdmin = {
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  deleteUser: vi.fn(),
};
vi.mock('../src/config/supabaseAdmin.js', () => ({
  supabaseAdmin: () => ({ auth: { admin: authAdmin } }),
}));

const { criarApp } = await import('../src/app.js');
const perfil = await import('../src/modulos/usuarios/perfilRepository.js');
const { pool } = await import('../src/config/db.js');
const atividades = await import('../src/modulos/logs/atividades.repository.js');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const OUTRO_ID = '22222222-2222-4222-8222-222222222222';
const app = criarApp();

const TODOS_OS_MODULOS = ['contratos', 'concursos', 'provas'];

/** O "token" simulado e o proprio id do usuario (ver mock do jose). */
function comAcesso(modulos, nivelAcesso = 0, usuarioId = ADMIN_ID) {
  perfil.buscarAcesso.mockResolvedValue({ nivelAcesso, modulos });
  return `Bearer ${usuarioId}`;
}
const ADMIN = () => comAcesso([], 4);

const usuario = (dados = {}) => ({
  id: OUTRO_ID,
  nome: 'Maria Souza',
  email: 'maria@exemplo.com',
  setor: null,
  nivel_acesso: 0,
  modulos: ['contratos'],
  receber_notificacoes: true,
  ...dados,
});

beforeEach(() => {
  vi.clearAllMocks();
  pool.query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('controle de acesso da Administracao', () => {
  it('sem token responde 401', async () => {
    const resposta = await request(app).get('/api/administracao/usuarios');
    expect(resposta.status).toBe(401);
  });

  it.each([[[]], [['contratos']], [TODOS_OS_MODULOS]])(
    'usuario com os modulos %j, sem ser administrador, recebe 403',
    async (modulos) => {
      const resposta = await request(app).get('/api/administracao/usuarios').set('Authorization', comAcesso(modulos));
      expect(resposta.status).toBe(403);
    },
  );

  it('administrador (nivel 4) lista os usuarios', async () => {
    pool.query.mockResolvedValueOnce({ rows: [usuario()], rowCount: 1 });
    const resposta = await request(app).get('/api/administracao/usuarios').set('Authorization', ADMIN());
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
  });

  it('o administrador acessa os tres modulos mesmo sem modulos marcados', async () => {
    for (const rota of ['/api/provas/status', '/api/contratos/status', '/api/concursos/status']) {
      const resposta = await request(app).get(rota).set('Authorization', ADMIN());
      expect(resposta.status, rota).toBe(200);
    }
  });
});

describe('cadastro de usuario', () => {
  it('recusa dados invalidos sem chamar o Supabase', async () => {
    const resposta = await request(app)
      .post('/api/administracao/usuarios')
      .set('Authorization', ADMIN())
      .send({ email: 'sem-arroba', nome: '', senha: '123', nivel_acesso: 3, modulos: ['financeiro'] });

    expect(resposta.status).toBe(400);
    expect(Object.keys(resposta.body.campos)).toEqual(['email', 'nome', 'senha', 'nivel_acesso', 'modulos']);
    expect(authAdmin.createUser).not.toHaveBeenCalled();
  });

  it('cria no Auth, grava o perfil com os modulos escolhidos e registra a atividade', async () => {
    authAdmin.createUser.mockResolvedValue({ data: { user: { id: OUTRO_ID } }, error: null });
    pool.query.mockResolvedValueOnce({ rows: [usuario({ modulos: ['contratos', 'provas'] })], rowCount: 1 });

    const resposta = await request(app)
      .post('/api/administracao/usuarios')
      .set('Authorization', ADMIN())
      .send({
        email: ' Maria@Exemplo.com ',
        nome: 'Maria Souza',
        senha: 'senhaforte1',
        nivel_acesso: 0,
        // fora de ordem e repetido: e gravado sem repeticao e na ordem padrao
        modulos: ['provas', 'contratos', 'provas'],
      });

    expect(resposta.status).toBe(201);
    expect(authAdmin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'maria@exemplo.com', password: 'senhaforte1', email_confirm: true }),
    );
    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('insert into usuarios');
    expect(valores).toEqual([OUTRO_ID, 'maria@exemplo.com', 'Maria Souza', null, 0, ['contratos', 'provas']]);
    expect(atividades.inserir).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({
        modulo: 'administracao',
        acao: 'criou',
        descricao: 'Cadastrou o usuário "Maria Souza" (maria@exemplo.com) com acesso a Contratos e Provas.',
      }),
    );
  });

  it('administrador e gravado com todos os modulos, marcados ou nao', async () => {
    authAdmin.createUser.mockResolvedValue({ data: { user: { id: OUTRO_ID } }, error: null });
    pool.query.mockResolvedValueOnce({ rows: [usuario({ nivel_acesso: 4, modulos: TODOS_OS_MODULOS })], rowCount: 1 });

    await request(app)
      .post('/api/administracao/usuarios')
      .set('Authorization', ADMIN())
      .send({ email: 'ana@exemplo.com', nome: 'Ana', senha: 'senhaforte1', nivel_acesso: 4, modulos: [] });

    expect(pool.query.mock.calls[0][1].slice(4)).toEqual([4, TODOS_OS_MODULOS]);
    expect(atividades.inserir.mock.calls[0][1].descricao).toContain('como administrador');
  });

  it('e-mail ja cadastrado responde 409', async () => {
    authAdmin.createUser.mockResolvedValue({ data: null, error: { code: 'email_exists', message: 'exists' } });
    const resposta = await request(app)
      .post('/api/administracao/usuarios')
      .set('Authorization', ADMIN())
      .send({ email: 'maria@exemplo.com', nome: 'Maria', senha: 'senhaforte1', modulos: ['contratos'] });
    expect(resposta.status).toBe(409);
  });

  it('desfaz a criacao no Auth se o perfil nao puder ser gravado', async () => {
    authAdmin.createUser.mockResolvedValue({ data: { user: { id: OUTRO_ID } }, error: null });
    authAdmin.deleteUser.mockResolvedValue({ error: null });
    pool.query.mockRejectedValueOnce(new Error('banco fora do ar'));

    const resposta = await request(app)
      .post('/api/administracao/usuarios')
      .set('Authorization', ADMIN())
      .send({ email: 'maria@exemplo.com', nome: 'Maria', senha: 'senhaforte1', modulos: ['contratos'] });

    expect(resposta.status).toBe(500);
    expect(authAdmin.deleteUser).toHaveBeenCalledWith(OUTRO_ID);
  });
});

describe('alteracao e exclusao de usuario', () => {
  it('altera os modulos de outro usuario e descreve a mudanca no log', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [usuario({ modulos: ['contratos'] })], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [usuario({ modulos: ['concursos', 'provas'] })], rowCount: 1 });

    const resposta = await request(app)
      .patch(`/api/administracao/usuarios/${OUTRO_ID}`)
      .set('Authorization', ADMIN())
      .send({ modulos: ['provas', 'concursos'] });

    expect(resposta.status).toBe(200);
    // so os modulos vieram: o nivel atual (0) e mantido e a lista sai na ordem padrao
    const [sql, valores] = pool.query.mock.calls[1];
    expect(sql).toContain('nivel_acesso = $');
    expect(valores).toEqual([OUTRO_ID, 0, ['concursos', 'provas']]);
    expect(atividades.inserir.mock.calls[0][1].descricao).toContain(
      'de acesso a Contratos para acesso a Concursos e Provas',
    );
  });

  it('modulo desconhecido responde 400', async () => {
    const resposta = await request(app)
      .patch(`/api/administracao/usuarios/${OUTRO_ID}`)
      .set('Authorization', ADMIN())
      .send({ modulos: ['contratos', 'financeiro'] });
    expect(resposta.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('administrador nao pode deixar de ser administrador', async () => {
    const resposta = await request(app)
      .patch(`/api/administracao/usuarios/${ADMIN_ID}`)
      .set('Authorization', ADMIN())
      .send({ nivel_acesso: 0, modulos: TODOS_OS_MODULOS });
    expect(resposta.status).toBe(409);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('administrador nao pode excluir a si mesmo', async () => {
    const resposta = await request(app)
      .delete(`/api/administracao/usuarios/${ADMIN_ID}`)
      .set('Authorization', ADMIN());
    expect(resposta.status).toBe(409);
    expect(authAdmin.deleteUser).not.toHaveBeenCalled();
  });

  it('exclui o perfil e o login do Auth', async () => {
    pool.query.mockResolvedValueOnce({ rows: [usuario()], rowCount: 1 });
    authAdmin.deleteUser.mockResolvedValue({ error: null });

    const resposta = await request(app)
      .delete(`/api/administracao/usuarios/${OUTRO_ID}`)
      .set('Authorization', ADMIN());

    expect(resposta.status).toBe(204);
    expect(authAdmin.deleteUser).toHaveBeenCalledWith(OUTRO_ID);
  });

  it('redefinir senha exige pelo menos 8 caracteres', async () => {
    const resposta = await request(app)
      .put(`/api/administracao/usuarios/${OUTRO_ID}/senha`)
      .set('Authorization', ADMIN())
      .send({ senha: 'curta' });
    expect(resposta.status).toBe(400);
    expect(authAdmin.updateUserById).not.toHaveBeenCalled();
  });
});
