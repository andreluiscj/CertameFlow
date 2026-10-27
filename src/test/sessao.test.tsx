import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue({ error: null }),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: m.signOut, getSession: m.getSession, onAuthStateChange: m.onAuthStateChange } },
}));

vi.stubEnv('VITE_API_URL', 'http://api.test');

import { AuthProvider } from '@/contexts/AuthContext';
import { api, ErroHttp } from '@/lib/api';

beforeEach(() => {
  vi.clearAllMocks();
  m.signOut.mockResolvedValue({ error: null });
  m.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('API: 401', () => {
  it('sai só deste aparelho e mostra a mensagem de sessão encerrada', async () => {
    m.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ mensagem: 'Token inválido' }), { status: 401 })));
    const erro = (await api.get('/api/x').catch((e) => e)) as ErroHttp;
    expect(erro).toBeInstanceOf(ErroHttp);
    expect(erro.message).toBe('Sua sessão foi encerrada. Entre novamente.');
    expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('403 não faz signOut', async () => {
    m.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    await api.get('/api/x').catch(() => undefined);
    expect(m.signOut).not.toHaveBeenCalled();
  });
});

describe('AuthContext: prazo de 2 h', () => {
  it('ao vencer, faz signOut local', async () => {
    localStorage.setItem('app_login_time', String(Date.now() - 3 * 60 * 60 * 1000));
    m.getSession.mockResolvedValue({ data: { session: { user: { id: 'u' } } }, error: null });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <AuthProvider><div /></AuthProvider>
        </QueryClientProvider>,
      );
    });
    expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' });
    act(() => root.unmount());
  });
});
