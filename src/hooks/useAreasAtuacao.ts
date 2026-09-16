import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AreaAtuacao, AreaAtuacaoInsert, AreaAtuacaoUpdate } from '@/types/database';
import { toast } from 'sonner';

export function useAreasAtuacao() {
  return useQuery({
    queryKey: ['provas-areas-atuacao'],
    queryFn: () => api.get<AreaAtuacao[]>('/api/provas/areas'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAreaElaboradoresCount() {
  return useQuery({
    queryKey: ['provas-elaboradores-count-by-area'],
    queryFn: () => api.get<Record<string, number>>('/api/provas/areas-contagem-elaboradores'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateAreaAtuacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AreaAtuacaoInsert) => api.post<AreaAtuacao>('/api/provas/areas', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-areas-atuacao'] });
      toast.success('Área cadastrada');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}

export function useUpdateAreaAtuacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: AreaAtuacaoUpdate & { id: string }) =>
      api.patch<AreaAtuacao>(`/api/provas/areas/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-areas-atuacao'] });
      toast.success('Área atualizada');
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar", e);
      toast.error("Erro ao atualizar. Tente novamente.");
    },
  });
}

export function useDeleteAreaAtuacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/provas/areas/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-areas-atuacao'] });
      qc.invalidateQueries({ queryKey: ['provas-elaboradores-count-by-area'] });
      toast.success('Área excluída');
    },
    onError: (e: Error) => {
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}

type VinculoAreaInput = { areaId: string; elaboradorId: string };

function invalidarElaboradoresDaArea(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['provas-elaboradores'] });
  qc.invalidateQueries({ queryKey: ['provas-elaboradores-count-by-area'] });
}

/** Adiciona um elaborador a uma área de atuação. */
export function useVincularElaboradorArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ areaId, elaboradorId }: VinculoAreaInput) =>
      api.post<void>(`/api/provas/areas/${areaId}/elaboradores`, { elaborador_id: elaboradorId }),
    onSuccess: () => {
      invalidarElaboradoresDaArea(qc);
      toast.success('Elaborador adicionado à área');
    },
    onError: (e: Error) => {
      console.error('Erro ao adicionar elaborador', e);
      toast.error(`Erro ao adicionar elaborador. ${e.message}`);
    },
  });
}

/** Remove um elaborador de uma área de atuação. O elaborador continua cadastrado. */
export function useDesvincularElaboradorArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ areaId, elaboradorId }: VinculoAreaInput) =>
      api.delete(`/api/provas/areas/${areaId}/elaboradores/${elaboradorId}`),
    onSuccess: () => {
      invalidarElaboradoresDaArea(qc);
      toast.success('Elaborador removido da área');
    },
    onError: (e: Error) => {
      console.error('Erro ao remover elaborador', e);
      toast.error(`Erro ao remover elaborador. ${e.message}`);
    },
  });
}
