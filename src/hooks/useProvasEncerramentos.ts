import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ProvaEncerramento as ProvaEncerramentoRow } from '@/types/database';

export type ProvaEncerramento = Pick<ProvaEncerramentoRow, 'concurso_id' | 'encerrado_em'>;

const QUERY_KEY = ['provas-concurso-encerramentos'];

export function useProvasEncerramentos() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<ProvaEncerramento[]>('/api/provas/encerramentos'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useEncerrarProvasConcurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (concursoId: string) =>
      api.put<ProvaEncerramento>(`/api/provas/encerramentos/${concursoId}`, {}),
    onMutate: async (concursoId: string) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<ProvaEncerramento[]>(QUERY_KEY) ?? [];
      const optimistic: ProvaEncerramento[] = previous.some(
        (p) => p.concurso_id === concursoId
      )
        ? previous
        : [
            ...previous,
            { concurso_id: concursoId, encerrado_em: new Date().toISOString() },
          ];
      qc.setQueryData(QUERY_KEY, optimistic);
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEY, ctx.previous);
      console.error('Erro ao encerrar concurso', e);
      toast.error('Erro ao encerrar concurso. Tente novamente.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useReabrirProvasConcurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (concursoId: string) => {
      await api.delete(`/api/provas/encerramentos/${concursoId}`);
      return concursoId;
    },
    onMutate: async (concursoId: string) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<ProvaEncerramento[]>(QUERY_KEY) ?? [];
      qc.setQueryData(
        QUERY_KEY,
        previous.filter((p) => p.concurso_id !== concursoId)
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEY, ctx.previous);
      console.error('Erro ao reabrir concurso', e);
      toast.error('Erro ao reabrir concurso. Tente novamente.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
