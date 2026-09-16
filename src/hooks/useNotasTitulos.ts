import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NotaTitulo, NotaTituloInsert, NotaTituloUpdate } from '@/types/database';

export function useNotasTitulos() {
  return useQuery({
    queryKey: ['concurso_notas_titulos'],
    queryFn: () => api.get<NotaTitulo[]>('/api/concursos/notas-titulos'),
    staleTime: 60 * 1000,
  });
}

export function useNotaTituloByConcurso(concursoId: string | undefined) {
  return useQuery({
    queryKey: ['concurso_notas_titulos', 'concurso', concursoId],
    queryFn: () =>
      concursoId ? api.get<NotaTitulo | null>(`/api/concursos/${concursoId}/nota-titulo`) : null,
    enabled: !!concursoId,
    staleTime: 60 * 1000,
  });
}

export function useUpsertNotaTitulo() {
  const queryClient = useQueryClient();

  return useMutation({
    // Cria ou altera a nota do concurso (uma por concurso).
    mutationFn: (payload: NotaTituloInsert) => api.put<NotaTitulo>('/api/concursos/notas-titulos', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concurso_notas_titulos'] });
    },
  });
}

export function useUpdateNotaTitulo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: NotaTituloUpdate & { id: string }) =>
      api.patch<NotaTitulo>(`/api/concursos/notas-titulos/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concurso_notas_titulos'] });
    },
  });
}

export function useDeleteNotaTitulo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/concursos/notas-titulos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concurso_notas_titulos'] });
    },
  });
}
