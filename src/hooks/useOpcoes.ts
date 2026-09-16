import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ConcursoTipo, ConcursoStatus } from '@/types/database';

export function useTiposConcurso() {
  return useQuery({
    queryKey: ['concurso-tipos'],
    queryFn: () => api.get<ConcursoTipo[]>('/api/concursos/tipos'),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useStatusConcurso() {
  return useQuery({
    queryKey: ['concurso-status'],
    queryFn: () => api.get<ConcursoStatus[]>('/api/concursos/status'),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
