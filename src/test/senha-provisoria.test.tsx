// Sem @testing-library/react (não instalado): react-dom + act direto.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = vi.hoisted(() => ({
  user: { id: 'u1', email: 'a@b.com', app_metadata: {} as Record<string, unknown> } as { id: string; email: string; app_metadata: Record<string, unknown> } | null,
  signOut: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  signIn: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user, loading: false, signOut: m.signOut }) }));
vi.mock('@/lib/api', () => ({ api: { put: m.put, post: m.post } }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithPassword: m.signIn } } }));
vi.mock('sonner', () => ({ toast: m.toast }));
vi.mock('@/pages/LoginPage', () => ({ default: () => <div>login</div> }));

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SenhaProvisoriaDialog } from '@/components/SenhaProvisoriaDialog';
import DefinirNovaSenhaPage from '@/pages/DefinirNovaSenhaPage';
import { lembrarSenhaDoLogin } from '@/lib/senhaDoLogin';

let container: HTMLElement;
let root: Root;

const render = (ui: React.ReactNode) =>
  act(async () => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>,
    );
  });
const porTexto = (t: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes(t)) as HTMLButtonElement;
const clicar = (el: Element) => act(async () => { (el as HTMLElement).click(); });
const digitar = (id: string, valor: string) =>
  act(async () => {
    const el = document.getElementById(id) as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

beforeEach(() => {
  vi.clearAllMocks();
  m.user = { id: 'u1', email: 'a@b.com', app_metadata: {} };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('SenhaProvisoriaDialog', () => {
  const gerada = { usuarioId: 'x1', nome: 'Maria', senha: 'Xk7p-M3qa-9bTz' };

  it('mostra a senha e copia para a área de transferência', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await render(<SenhaProvisoriaDialog gerada={gerada} onClose={() => {}} />);
    expect(document.body.textContent).toContain('Xk7p-M3qa-9bTz');
    await clicar(porTexto('Copiar'));
    expect(writeText).toHaveBeenCalledWith('Xk7p-M3qa-9bTz');
    expect(m.toast.success).toHaveBeenCalledWith('Senha copiada.');
  });

  it('avisa quando o clipboard falha', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error()) }, configurable: true });
    await render(<SenhaProvisoriaDialog gerada={gerada} onClose={() => {}} />);
    await clicar(porTexto('Copiar'));
    expect(m.toast.error).toHaveBeenCalled();
  });

  it('envia por e-mail e mostra o erro do servidor', async () => {
    m.post.mockRejectedValueOnce(new Error('Envio de e-mail não configurado'));
    await render(<SenhaProvisoriaDialog gerada={gerada} onClose={() => {}} />);
    await clicar(porTexto('Enviar senha via e-mail'));
    expect(m.post).toHaveBeenCalledWith('/api/administracao/usuarios/x1/senha-provisoria/envios', { senha_provisoria: 'Xk7p-M3qa-9bTz' });
    expect(m.toast.error).toHaveBeenCalledWith('Envio de e-mail não configurado', { duration: 10_000 });
  });

  it('não mostra nada sem senha', async () => {
    await render(<SenhaProvisoriaDialog gerada={null} onClose={() => {}} />);
    expect(document.body.textContent).not.toContain('Senha provisória');
  });
});

describe('ProtectedRoute', () => {
  it('com trocar_senha, mostra só a tela de nova senha', async () => {
    m.user!.app_metadata = { trocar_senha: true };
    await render(<ProtectedRoute><div>CONTEUDO-PROTEGIDO</div></ProtectedRoute>);
    expect(document.body.textContent).toContain('Defina sua nova senha');
    expect(document.body.textContent).not.toContain("CONTEUDO-PROTEGIDO");
  });

  it('sem a marca, libera o conteúdo', async () => {
    await render(<ProtectedRoute><div>CONTEUDO-PROTEGIDO</div></ProtectedRoute>);
    expect(document.body.textContent).toContain("CONTEUDO-PROTEGIDO");
  });
});

describe('DefinirNovaSenhaPage', () => {
  beforeEach(() => { m.user!.app_metadata = { trocar_senha: true }; });
  const enviar = () => act(async () => { document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });

  it('recusa senha curta e senhas diferentes sem chamar a API', async () => {
    await render(<DefinirNovaSenhaPage />);
    await digitar('nova-senha', 'curta'); await digitar('confirmar-senha', 'curta');
    await enviar();
    expect(document.body.textContent).toContain('pelo menos 12');
    await digitar('nova-senha', 'senhalonga123'); await digitar('confirmar-senha', 'outra-coisa');
    await enviar();
    expect(document.body.textContent).toContain('não conferem');
    expect(m.put).not.toHaveBeenCalled();
  });

  it('recusa nova senha igual à provisória usada no login', async () => {
    lembrarSenhaDoLogin('Xk7p-M3qa-9bTz');
    await render(<DefinirNovaSenhaPage />);
    await digitar('nova-senha', 'Xk7p-M3qa-9bTz'); await digitar('confirmar-senha', 'Xk7p-M3qa-9bTz');
    await enviar();
    expect(document.body.textContent).toContain('diferente da senha provisória');
    expect(m.put).not.toHaveBeenCalled();
    lembrarSenhaDoLogin('');
  });

  it('troca a senha e entra de novo com ela', async () => {
    m.put.mockResolvedValue(undefined);
    m.signIn.mockResolvedValue({ error: null });
    await render(<DefinirNovaSenhaPage />);
    await digitar('nova-senha', 'senhalonga123'); await digitar('confirmar-senha', 'senhalonga123');
    await enviar();
    expect(m.put).toHaveBeenCalledWith('/api/usuarios/eu/senha', { senha: 'senhalonga123' });
    expect(m.signIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'senhalonga123' });
    expect(m.signOut).not.toHaveBeenCalled();
  });

  it('se o novo login falhar, sai e avisa', async () => {
    m.put.mockResolvedValue(undefined);
    m.signIn.mockResolvedValue({ error: new Error('x') });
    await render(<DefinirNovaSenhaPage />);
    await digitar('nova-senha', 'senhalonga123'); await digitar('confirmar-senha', 'senhalonga123');
    await enviar();
    expect(m.signOut).toHaveBeenCalled();
    expect(m.toast.info).toHaveBeenCalled();
  });

  it('mostra o erro da API e não faz login', async () => {
    m.put.mockRejectedValue(new Error('Senha fraca'));
    await render(<DefinirNovaSenhaPage />);
    await digitar('nova-senha', 'senhalonga123'); await digitar('confirmar-senha', 'senhalonga123');
    await enviar();
    expect(document.body.textContent).toContain('Senha fraca');
    expect(m.signIn).not.toHaveBeenCalled();
  });
});
