import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = vi.hoisted(() => ({
  toast: vi.fn(),
  signIn: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'a@b.com' }, signOut: vi.fn() }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithPassword: m.signIn, updateUser: m.updateUser } } }));

import { ChangePasswordDialog } from '@/components/layout/ChangePasswordDialog';

let container: HTMLElement;
let root: Root;

const digitar = (id: string, valor: string) =>
  act(async () => {
    const el = document.getElementById(id) as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
const enviar = (nova: string) =>
  act(async () => {
    await digitar('current-password', 'SenhaAtual123');
    await digitar('new-password', nova);
    await digitar('confirm-password', nova);
    document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['setTimeout'] });
  m.signIn.mockResolvedValue({ error: null });
  m.updateUser.mockResolvedValue({ error: null });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<ChangePasswordDialog open onOpenChange={() => {}} />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('ChangePasswordDialog: mínimo de 12 caracteres', () => {
  it('recusa 11 caracteres sem chamar o Supabase', async () => {
    await enviar('Onze1234567');
    expect(m.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('pelo menos 12') }));
    expect(m.signIn).not.toHaveBeenCalled();
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  it('aceita 12 caracteres e chama updateUser', async () => {
    await enviar('Doze12345678');
    expect(m.updateUser).toHaveBeenCalledWith({ password: 'Doze12345678' });
  });
});
