import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { EventoAgenda, EventoAgendaInsert, EventoComConcurso } from '@/types/database';

export function useEventos({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['eventos'],
    enabled,
    queryFn: () => api.get<EventoComConcurso[]>('/api/concursos/eventos'),
    staleTime: 30 * 1000,
  });
}

export function useEventosByConcurso(concursoId: string | undefined) {
  return useQuery({
    queryKey: ['eventos', 'concurso', concursoId],
    queryFn: () =>
      concursoId
        ? api.get<EventoComConcurso[]>(`/api/concursos/eventos?concurso_id=${encodeURIComponent(concursoId)}`)
        : [],
    enabled: !!concursoId,
    staleTime: 30 * 1000,
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evento: EventoAgendaInsert) => api.post<EventoAgenda>('/api/concursos/eventos', evento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

/**
 * Importa as tarefas de um arquivo numa única chamada, para a API registrar
 * quem importou. Linhas inválidas voltam contadas em "falhas".
 */
export function useImportarEventos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      concursoId,
      arquivo,
      eventos,
    }: {
      concursoId: string;
      arquivo?: string;
      eventos: Array<Pick<EventoAgendaInsert, 'titulo' | 'data' | 'hora' | 'cor'>>;
    }) =>
      api.post<{ importados: number; falhas: number }>(
        `/api/concursos/${concursoId}/eventos/importacoes`,
        { arquivo, eventos },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

export function useDeleteEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/concursos/eventos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

export function useMarcarEventoConcluido() {
  const queryClient = useQueryClient();

  return useMutation({
    // A API registra quem concluiu e, ao concluir a última tarefa pendente,
    // finaliza o concurso na mesma transação.
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      const resposta = await api.put<{ evento: EventoAgenda; concurso_finalizado: string | null }>(
        `/api/concursos/eventos/${id}/conclusao`,
        { concluido },
      );
      return resposta;
    },
    onMutate: async ({ id, concluido }) => {
      await queryClient.cancelQueries({ queryKey: ['eventos'] });

      const previousEventos = queryClient.getQueriesData<EventoComConcurso[]>({ queryKey: ['eventos'] });

      queryClient.setQueriesData<EventoComConcurso[]>({ queryKey: ['eventos'] }, (old) =>
        old?.map((evento) => (evento.id === id ? { ...evento, concluido } : evento)),
      );

      return { previousEventos };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousEventos) {
        context.previousEventos.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: ({ concurso_finalizado }) => {
      if (concurso_finalizado !== null) {
        queryClient.invalidateQueries({ queryKey: ['concursos'] });
        toast.success(`Concurso "${concurso_finalizado}" finalizado automaticamente! Todas as tarefas foram concluídas.`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

export function useUpdateEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string; titulo?: string; data?: string; hora?: string | null; cor?: string | null }) =>
      api.patch<EventoAgenda>(`/api/concursos/eventos/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

export function useDeleteEventosByConcurso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (concursoId: string) => api.delete(`/api/concursos/${concursoId}/eventos`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

export function useSalvarEventosConcluidos() {
  const queryClient = useQueryClient();

  return useMutation({
    // Uma única transação: ou todas as alterações são salvas, ou nenhuma.
    mutationFn: async (updates: Array<{ id: string; concluido: boolean }>) => {
      try {
        await api.post('/api/concursos/eventos-conclusoes', { alteracoes: updates });
      } catch {
        throw new Error('Falha ao salvar algumas alterações');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}

/** Total de eventos e quantos estão concluídos, por concurso. */
export function useConcursosProgresso(concursoIds: string[]) {
  return useQuery({
    queryKey: ['concursos-progresso', [...concursoIds].sort()],
    queryFn: () =>
      concursoIds.length === 0
        ? ({} as Record<string, { total: number; concluidos: number }>)
        : api.get<Record<string, { total: number; concluidos: number }>>(
            `/api/concursos/eventos-progresso?ids=${concursoIds.map(encodeURIComponent).join(',')}`,
          ),
    enabled: concursoIds.length > 0,
    staleTime: 60 * 1000,
  });
}

export function useMarcarTodosEventosConcluidos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ concursoId, concluido }: { concursoId: string; concluido: boolean }) =>
      api.put<EventoAgenda[]>(`/api/concursos/${concursoId}/eventos/conclusao`, { concluido }),
    onMutate: async ({ concursoId, concluido }) => {
      await queryClient.cancelQueries({ queryKey: ['eventos'] });

      const previousEventos = queryClient.getQueriesData<EventoComConcurso[]>({ queryKey: ['eventos'] });

      queryClient.setQueriesData<EventoComConcurso[]>({ queryKey: ['eventos'] }, (old) =>
        old?.map((evento) => (evento.concurso_id === concursoId ? { ...evento, concluido } : evento)),
      );

      return { previousEventos };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousEventos) {
        context.previousEventos.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}
