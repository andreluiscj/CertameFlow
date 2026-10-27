import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.stubEnv('SESSAO_MAX_HORAS', ''); // sem apagar as variaveis de test/ambiente.js
  vi.resetModules();
});

describe('SESSAO_MAX_HORAS', () => {
  it('usa 8 por padrao', async () => {
    vi.resetModules();
    expect((await import('../src/config/env.js')).env.sessaoMaxHoras).toBe(8);
  });

  it.each(['0', '-3'])('valor %s impede a inicializacao com mensagem clara', async (valor) => {
    vi.stubEnv('SESSAO_MAX_HORAS', valor);
    vi.resetModules();
    await expect(import('../src/config/env.js')).rejects.toThrow(/SESSAO_MAX_HORAS deve ser um inteiro maior que 0/);
  });
});
