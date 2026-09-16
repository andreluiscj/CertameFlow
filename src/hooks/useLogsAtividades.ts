import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ModuloLogs = 'concursos' | 'contratos' | 'provas' | 'administracao';

export interface LogAtividade {
  id: string;
  modulo: ModuloLogs;
  acao: string;
  descricao: string;
  entidade: string | null;
  entidade_id: string | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  created_at: string;
}

/** Registros de atividade de um módulo, do mais recente para o mais antigo. */
export function useLogsAtividades(modulo: ModuloLogs, limite = 1000) {
  return useQuery({
    queryKey: ['logs-atividades', modulo, limite],
    queryFn: () => api.get<LogAtividade[]>(`/api/${modulo}/logs?limite=${limite}`),
    staleTime: 15 * 1000,
    refetchOnMount: 'always',
  });
}
