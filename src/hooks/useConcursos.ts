import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Concurso, ConcursoInsert, ConcursoUpdate } from '@/types/database';

export function useConcursos() {
  return useQuery({
    queryKey: ['concursos'],
    queryFn: () => api.get<Concurso[]>('/api/concursos'),
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
}

export function useConcurso(id: string | undefined) {
  return useQuery({
    queryKey: ['concursos', id],
    queryFn: () => (id ? api.getOrNull<Concurso>(`/api/concursos/${id}`) : null),
    enabled: !!id,
  });
}

export function useCreateConcurso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (concurso: ConcursoInsert) => api.post<Concurso>('/api/concursos', concurso),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concursos'] });
    },
  });
}

export function useUpdateConcurso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...alteracoes }: ConcursoUpdate & { id: string }) =>
      api.patch<Concurso>(`/api/concursos/${id}`, alteracoes),
    onSuccess: (concurso) => {
      queryClient.invalidateQueries({ queryKey: ['concursos'] });
      queryClient.invalidateQueries({ queryKey: ['concursos', concurso.id] });
    },
  });
}

export function useDeleteConcurso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/concursos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concursos'] });
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
    },
  });
}
