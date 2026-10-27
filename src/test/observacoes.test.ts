import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({ api: {} }));
import { podeExcluirObservacao } from '@/hooks/useObservacoes';

describe('podeExcluirObservacao', () => {
  it('autor pode', () => expect(podeExcluirObservacao({ usuario_id: 'a' }, 'a', false)).toBe(true));
  it('outro usuário não pode', () => expect(podeExcluirObservacao({ usuario_id: 'a' }, 'b', false)).toBe(false));
  it('administrador pode', () => expect(podeExcluirObservacao({ usuario_id: 'a' }, 'b', true)).toBe(true));
  it('autor removido (null) só para admin', () => {
    expect(podeExcluirObservacao({ usuario_id: null }, 'b', false)).toBe(false);
    expect(podeExcluirObservacao({ usuario_id: null }, undefined, false)).toBe(false);
  });
});
