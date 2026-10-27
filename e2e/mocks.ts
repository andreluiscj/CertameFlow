import type { Page, Route } from '@playwright/test';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
export const SENHA_PROVISORIA = 'Abcd-Efgh-Jkmn';
export const ID_ADMIN = '11111111-1111-4111-8111-111111111111';
export const ID_ALVO = '22222222-2222-4222-8222-222222222222';

export interface Estado {
  email: string;
  senha: string;
  trocar: boolean;
  nivel: number;
  chamadas: string[]; // "METODO caminho", na ordem
  envio: number; // status devolvido por .../envios
  tokensEmitidos: number;
}

export function novoEstado(p: Partial<Estado> = {}): Estado {
  return { email: 'admin@teste.com', senha: 'SenhaNormal1', trocar: false, nivel: 4, chamadas: [], envio: 503, tokensEmitidos: 0, ...p };
}

const json = (route: Route, status: number, corpo?: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: corpo === undefined ? '' : JSON.stringify(corpo) });

function sessao(e: Estado) {
  const agora = Math.floor(Date.now() / 1000);
  const user = {
    id: ID_ADMIN, aud: 'authenticated', role: 'authenticated', email: e.email,
    app_metadata: e.trocar ? { trocar_senha: true } : {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  };
  const access_token = `${b64({ alg: 'none' })}.${b64({ sub: ID_ADMIN, exp: agora + 3600, app_metadata: user.app_metadata })}.x`;
  return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: agora + 3600, refresh_token: `r${++e.tokensEmitidos}`, user };
}

/** Instala as respostas falsas do Supabase Auth, do PostgREST e do Express. */
export async function instalarMocks(page: Page, e: Estado) {
  // Rede de segurança: qualquer host externo é abortado.
  await page.route((u) => u.hostname !== 'localhost', (r) => r.abort());

  await page.route('**/auth/v1/token**', async (route) => {
    const corpo = route.request().postDataJSON();
    e.chamadas.push('POST /auth/v1/token');
    if (corpo?.email === e.email && corpo?.password === e.senha) return json(route, 200, sessao(e));
    return json(route, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
  });
  await page.route('**/auth/v1/user', async (route) => {
    e.chamadas.push(`${route.request().method()} /auth/v1/user`);
    if (route.request().method() === 'PUT') e.senha = route.request().postDataJSON().password;
    return json(route, 200, sessao(e).user);
  });
  await page.route('**/auth/v1/logout**', (r) => json(r, 204));
  await page.route('**/rest/v1/**', async (route) => {
    if (!route.request().url().includes('/rest/v1/usuarios')) return json(route, 200, []);
    const perfil = { id: ID_ADMIN, nome: 'Admin Teste', email: e.email, setor: 'TI', nivel_acesso: e.nivel, modulos: ['contratos', 'concursos', 'provas'] };
    const objeto = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return json(route, 200, objeto ? perfil : [perfil]);
  });

  const usuarioAlvo = { id: ID_ALVO, nome: 'Maria Souza', email: 'maria@exemplo.com', setor: 'RH', nivel_acesso: 0, modulos: ['contratos'], receber_notificacoes: true };
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const caminho = new URL(req.url()).pathname;
    e.chamadas.push(`${req.method()} ${caminho}`);
    const ehTroca = req.method() === 'PUT' && caminho === '/api/usuarios/eu/senha';
    if (e.trocar && !ehTroca) {
      return json(route, 403, { mensagem: 'Defina sua nova senha para continuar.', campos: {}, codigo: 'troca_de_senha_obrigatoria' });
    }
    if (ehTroca) {
      if (!e.trocar) return json(route, 409, { mensagem: 'Nenhuma troca pendente.', campos: {} });
      e.senha = req.postDataJSON().senha;
      e.trocar = false;
      return json(route, 204);
    }
    if (req.method() === 'GET' && caminho === '/api/administracao/usuarios') return json(route, 200, [usuarioAlvo]);
    if (req.method() === 'POST' && caminho === '/api/administracao/usuarios') {
      const dados = req.postDataJSON();
      return json(route, 201, { usuario: { ...usuarioAlvo, nome: dados.nome, email: dados.email }, senha_provisoria: SENHA_PROVISORIA });
    }
    if (req.method() === 'POST' && caminho.endsWith('/envios')) {
      return e.envio === 204 ? json(route, 204) : json(route, e.envio, { mensagem: 'O envio de e-mail não está configurado no servidor.', campos: {} });
    }
    if (req.method() === 'POST' && caminho.endsWith('/senha-provisoria')) return json(route, 200, { senha_provisoria: SENHA_PROVISORIA });
    if (caminho.startsWith('/api/administracao/notificacoes')) return json(route, 200, { configurado: false, hora: 8, fusoHorario: 'America/Sao_Paulo', ultimoEnvio: null });
    return json(route, 200, []);
  });
}

/** Entra pela tela de login (usa o mock de auth). */
export async function entrar(page: Page, email: string, senha: string) {
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}
