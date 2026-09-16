import { useUserProfile } from './useUserProfile';

/**
 * Sistema de níveis de acesso:
 * - Nível 1: acesso apenas ao módulo futuro (placeholder)
 * - Nível 2: nível 1 + módulo Concursos
 * - Nível 3: acesso geral (todos os módulos, incluindo Provas)
 *
 * Regra: usuário pode acessar um módulo se seu nivel_acesso >= nível mínimo do módulo.
 */

export type ModuleKey = 'concursos' | 'provas' | 'contratos';

export const MODULE_MIN_LEVEL: Record<ModuleKey, number> = {
  contratos: 1,
  concursos: 2,
  provas: 3,
};

export function useAccessLevel() {
  const { data: profile, isLoading } = useUserProfile();
  const level = profile?.nivel_acesso ?? 0;

  const canAccess = (module: ModuleKey) => level >= MODULE_MIN_LEVEL[module];
  const hasAtLeast = (min: number) => level >= min;

  return { level, isLoading, canAccess, hasAtLeast };
}
