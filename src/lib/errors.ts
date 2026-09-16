/** Retorna uma mensagem segura para exibir ao usuário. */
export function getErrorMessage(error: unknown, fallback = 'Erro desconhecido'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
