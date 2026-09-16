import { useUserProfile } from './useUserProfile';

/**
 * Acesso do usuário:
 * - cada usuário acessa os módulos marcados para ele na Administração, em
 *   qualquer combinação;
 * - o nível 4 (administrador) acessa todos os módulos e a Administração.
 *
 * O frontend usa o acesso só para mostrar ou esconder telas. Quem decide o que
 * cada usuário pode fazer é a API, que confere o acesso a cada requisição.
 */

export type ModuleKey = 'contratos' | 'concursos' | 'provas';

export const MODULOS: { key: ModuleKey; rotulo: string }[] = [
  { key: 'contratos', rotulo: 'Contratos' },
  { key: 'concursos', rotulo: 'Concursos' },
  { key: 'provas', rotulo: 'Provas' },
];

export const NIVEL_ADMINISTRACAO = 4;

export function useAccessLevel() {
  const { data: profile, isLoading } = useUserProfile();
  const isAdmin = profile?.nivel_acesso === NIVEL_ADMINISTRACAO;
  const modulos = (profile?.modulos ?? []) as ModuleKey[];

  const canAccess = (module: ModuleKey) => isAdmin || modulos.includes(module);

  return { isLoading, isAdmin, modulos, canAccess };
}
