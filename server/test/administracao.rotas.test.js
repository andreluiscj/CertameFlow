import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  // Sufixo "|troca" no token simula a marca trocar_senha no app_metadata.
  jwtVerify: vi.fn(async (token) => {
    const [sub, marca] = token.split('|');
    return { payload: { sub, app_metadata: marca ? { trocar_senha: true } : {} } };
  }),
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
  getUserById: vi.fn(),
  deleteUser: vi.fn(),
};
vi.mock('../src/config/supabaseAdmin.js', () => ({
  supabaseAdmin: () => ({ auth: { admin: authAdmin } }),
}));

vi.mock('../src/modulos/notificacoes/email.js', () => ({
  emailConfigurado: vi.fn(() => true),
  enviarEmail: vi.fn(),
  descreverErroSmtp: (e) => `smtp: ${e.message}`,
}));

const { criarApp } = await import('../src/app.js');
const email = await import('../src/modulos/notificacoes/email.js');
const { FORMATO_SENHA_PROVISORIA, gerarSenhaProvisoria } = await import(
  '../src/modulos/administracao/usuarios.service.js'
);
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
      .send({ email: 'sem-arroba', nome: '', nivel_acesso: 3, modulos: ['financeiro'] });

    expect(resposta.status).toBe(400);
    expect(Object.keys(resposta.body.campos)).toEqual(['email', 'nome', 'nivel_acesso', 'modulos']);
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
        nivel_acesso: 0,
        // fora de ordem e repetido: e gravado sem repeticao e na ordem padrao
        modulos: ['provas', 'contratos', 'provas'],
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.usuario.email).toBe('maria@exemplo.com');
    expect(resposta.body.senha_provisoria).toMatch(FORMATO_SENHA_PROVISORIA);
    expect(authAdmin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'maria@exemplo.com', password: expect.stringMatching(FORMATO_SENHA_PROVISORIA), email_confirm: true, app_metadata: { trocar_senha: true } }),
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
      .send({ email: 'ana@exemplo.com', nome: 'Ana', nivel_acesso: 4, modulos: [] });

    expect(pool.query.mock.calls[0][1].slice(4)).toEqual([4, TODOS_OS_MODULOS]);
    expect(atividades.inserir.mock.calls[0][1].descricao).toContain('como administrador');
  });

  it('e-mail ja cadastrado responde 409', async () => {
    authAdmin.createUser.mockResolvedValue({ data: null, error: { code: 'email_exists', message: 'exists' } });
    const resposta = await request(app)
      .post('/api/administracao/usuarios')
      .set('Authorization', ADMIN())
      .send({ email: 'maria@exemplo.com', nome: 'Maria', modulos: ['contratos'] });
    expect(resposta.status).toBe(409);
  });

  it('desfaz a criacao no Auth se o perfil nao puder ser gravado', async () => {
    authAdmin.createUser.mockResolvedValue({ data: { user: { id: OUTRO_ID } }, error: null });
    authAdmin.deleteUser.mockResolvedValue({ error: null });
    pool.query.mockRejectedValueOnce(new Error('banco fora do ar'));

    const resposta = await request(app)
      .post('/api/administracao/usuarios')
      .set('Authorization', ADMIN())
      .send({ email: 'maria@exemplo.com', nome: 'Maria', modulos: ['contratos'] });

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

  it('gera senha provisoria nova, com a marca, e nao a grava no log', async () => {
    pool.query.mockResolvedValueOnce({ rows: [usuario()], rowCount: 1 });
    authAdmin.updateUserById.mockResolvedValue({ error: null });

    const resposta = await request(app)
      .post(`/api/administracao/usuarios/${OUTRO_ID}/senha-provisoria`)
      .set('Authorization', ADMIN());

    expect(resposta.status).toBe(200);
    expect(resposta.body.senha_provisoria).toMatch(FORMATO_SENHA_PROVISORIA);
    expect(authAdmin.updateUserById).toHaveBeenCalledWith(OUTRO_ID, {
      password: resposta.body.senha_provisoria,
      app_metadata: { trocar_senha: true },
    });
    expect(JSON.stringify(atividades.inserir.mock.calls)).not.toContain(resposta.body.senha_provisoria);
  });

  it('nao gera senha provisoria para o proprio administrador (409) nem para id inexistente (404)', async () => {
    const proprio = await request(app)
      .post(`/api/administracao/usuarios/${ADMIN_ID}/senha-provisoria`)
      .set('Authorization', ADMIN());
    expect(proprio.status).toBe(409);
    const inexistente = await request(app)
      .post(`/api/administracao/usuarios/${OUTRO_ID}/senha-provisoria`)
      .set('Authorization', ADMIN());
    expect(inexistente.status).toBe(404);
    expect(authAdmin.updateUserById).not.toHaveBeenCalled();
  });

  it('a rota antiga de senha digitada pelo administrador deixou de existir', async () => {
    const resposta = await request(app)
      .put(`/api/administracao/usuarios/${OUTRO_ID}/senha`)
      .set('Authorization', ADMIN())
      .send({ senha: 'senhaforte1' });
    expect(resposta.status).toBe(404);
  });
});

describe('envio da senha provisoria por e-mail', () => {
  const SENHA = 'Xk7p-M3qa-9bTz';
  const url = `/api/administracao/usuarios/${OUTRO_ID}/senha-provisoria/envios`;
  const authUser = (meta = { trocar_senha: true }) => ({
    data: { user: { id: OUTRO_ID, email: 'maria@exemplo.com', app_metadata: meta, user_metadata: { nome: 'Maria' } } },
    error: null,
  });

  it('envia ao e-mail do Auth com login e senha, e nao registra a senha no log', async () => {
    authAdmin.getUserById.mockResolvedValue(authUser());
    const resposta = await request(app)
      .post(url)
      .set('Authorization', ADMIN())
      .send({ senha_provisoria: SENHA, para: 'x@y.com' });

    expect(resposta.status).toBe(204);
    const envio = email.enviarEmail.mock.calls[0][0];
    expect(envio.para).toBe('maria@exemplo.com');
    expect(envio.texto).toContain('Login: maria@exemplo.com');
    expect(envio.texto).toContain(`Senha provisória: ${SENHA}`);
    expect(JSON.stringify(atividades.inserir.mock.calls)).not.toContain(SENHA);
  });

  it('recusa formato invalido (400) sem consultar o Auth', async () => {
    const resposta = await request(app).post(url).set('Authorization', ADMIN()).send({ senha_provisoria: 'texto livre' });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos.senha_provisoria).toBeDefined();
    expect(authAdmin.getUserById).not.toHaveBeenCalled();
  });

  it('sem SMTP responde 503', async () => {
    email.emailConfigurado.mockReturnValueOnce(false);
    const resposta = await request(app).post(url).set('Authorization', ADMIN()).send({ senha_provisoria: SENHA });
    expect(resposta.status).toBe(503);
    expect(email.enviarEmail).not.toHaveBeenCalled();
  });

  it('recusa sem a marca trocar_senha (409) e usuario inexistente (404)', async () => {
    authAdmin.getUserById.mockResolvedValueOnce(authUser({}));
    const jaTrocou = await request(app).post(url).set('Authorization', ADMIN()).send({ senha_provisoria: SENHA });
    expect(jaTrocou.status).toBe(409);
    authAdmin.getUserById.mockResolvedValueOnce({ data: { user: null }, error: null });
    const inexistente = await request(app).post(url).set('Authorization', ADMIN()).send({ senha_provisoria: SENHA });
    expect(inexistente.status).toBe(404);
    expect(email.enviarEmail).not.toHaveBeenCalled();
  });

  it('falha do SMTP responde 502', async () => {
    authAdmin.getUserById.mockResolvedValue(authUser());
    email.enviarEmail.mockRejectedValueOnce(new Error('recusado'));
    const resposta = await request(app).post(url).set('Authorization', ADMIN()).send({ senha_provisoria: SENHA });
    expect(resposta.status).toBe(502);
  });
});

describe('troca obrigatoria da senha', () => {
  it('rota com marca e bloqueada com 403 e codigo, antes de consultar o banco', async () => {
    const resposta = await request(app)
      .get('/api/administracao/usuarios')
      .set('Authorization', `Bearer ${ADMIN_ID}|troca`);
    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({
      mensagem: 'Defina sua nova senha para continuar.',
      campos: {},
      codigo: 'troca_de_senha_obrigatoria',
    });
    expect(perfil.buscarAcesso).not.toHaveBeenCalled();
  });

  it.each(['/api/concursos', '/api/contratos', '/api/provas'])('%s tambem bloqueia quem tem a marca (403)', async (rota) => {
    const resposta = await request(app).get(rota).set('Authorization', `Bearer ${ADMIN_ID}|troca`);
    expect(resposta.status).toBe(403);
    expect(resposta.body.codigo).toBe('troca_de_senha_obrigatoria');
  });

  it('PUT /api/usuarios/eu/senha e liberada com marca e remove a marca', async () => {
    perfil.buscarAcesso.mockResolvedValue({ nivelAcesso: 0, modulos: [] });
    authAdmin.updateUserById.mockResolvedValue({ error: null });
    const resposta = await request(app)
      .put('/api/usuarios/eu/senha')
      .set('Authorization', `Bearer ${OUTRO_ID}|troca`)
      .send({ senha: 'minhaSenhaNova1' });
    expect(resposta.status).toBe(204);
    expect(authAdmin.updateUserById).toHaveBeenCalledWith(OUTRO_ID, {
      password: 'minhaSenhaNova1',
      app_metadata: { trocar_senha: null },
    });
    expect(JSON.stringify(atividades.inserir.mock.calls)).not.toContain('minhaSenhaNova1');
  });

  it('sem a marca, a troca e recusada (409) e o Auth nao e chamado', async () => {
    perfil.buscarAcesso.mockResolvedValue({ nivelAcesso: 0, modulos: [] });
    const resposta = await request(app)
      .put('/api/usuarios/eu/senha')
      .set('Authorization', `Bearer ${OUTRO_ID}`)
      .send({ senha: 'minhaSenhaNova1' });
    expect(resposta.status).toBe(409);
    expect(authAdmin.updateUserById).not.toHaveBeenCalled();
  });

  it('senha com 11 caracteres e recusada e com 12 e aceita', async () => {
    perfil.buscarAcesso.mockResolvedValue({ nivelAcesso: 0, modulos: [] });
    authAdmin.updateUserById.mockResolvedValue({ error: null });
    const enviar = (senha) =>
      request(app).put('/api/usuarios/eu/senha').set('Authorization', `Bearer ${OUTRO_ID}|troca`).send({ senha });
    expect((await enviar('a'.repeat(11))).status).toBe(400);
    expect((await enviar('a'.repeat(12))).status).toBe(204);
  });

  it('senha com mais de 72 caracteres responde 400', async () => {
    perfil.buscarAcesso.mockResolvedValue({ nivelAcesso: 0, modulos: [] });
    const resposta = await request(app)
      .put('/api/usuarios/eu/senha')
      .set('Authorization', `Bearer ${OUTRO_ID}|troca`)
      .send({ senha: 'a'.repeat(73) });
    expect(resposta.status).toBe(400);
  });

  it('respostas com senha provisoria saem com Cache-Control no-store', async () => {
    pool.query.mockResolvedValueOnce({ rows: [usuario()], rowCount: 1 });
    authAdmin.updateUserById.mockResolvedValue({ error: null });
    const resposta = await request(app)
      .post(`/api/administracao/usuarios/${OUTRO_ID}/senha-provisoria`)
      .set('Authorization', ADMIN());
    expect(resposta.headers['cache-control']).toBe('no-store');
  });

  it('senha nova curta responde 400', async () => {
    perfil.buscarAcesso.mockResolvedValue({ nivelAcesso: 0, modulos: [] });
    const resposta = await request(app)
      .put('/api/usuarios/eu/senha')
      .set('Authorization', `Bearer ${OUTRO_ID}|troca`)
      .send({ senha: 'curta' });
    expect(resposta.status).toBe(400);
    expect(authAdmin.updateUserById).not.toHaveBeenCalled();
  });
});

describe('gerarSenhaProvisoria', () => {
  it('segue o formato, sem caracteres ambiguos, com maiuscula, minuscula e digito', () => {
    for (let i = 0; i < 500; i += 1) {
      const senha = gerarSenhaProvisoria();
      expect(senha).toMatch(FORMATO_SENHA_PROVISORIA);
      expect(senha).not.toMatch(/[0OolI1]/);
      expect(senha).toMatch(/[A-Z]/);
      expect(senha).toMatch(/[a-z]/);
      expect(senha).toMatch(/\d/);
    }
  });

  it('nao repete senha', () => {
    expect(new Set(Array.from({ length: 200 }, gerarSenhaProvisoria)).size).toBe(200);
  });
});
