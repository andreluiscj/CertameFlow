import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { StatusProva, StatusProvaInsert, StatusProvaUpdate as StatusProvaPatch } from '@/types/database';

export type { StatusProva, StatusProvaInsert };

export type StatusProvaUpdate = Pick<StatusProva, 'id'> & StatusProvaPatch;

export function useStatusProvas() {
  return useQuery({
    queryKey: ['provas-status'],
    queryFn: () => api.get<StatusProva[]>('/api/provas/status'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStatusProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StatusProvaInsert) => api.post<StatusProva>('/api/provas/status', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-status'] });
      toast.success('Status cadastrado');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}

export function useUpdateStatusProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: StatusProvaUpdate) =>
      api.patch<StatusProva>(`/api/provas/status/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-status'] });
      toast.success('Status atualizado');
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar", e);
      toast.error("Erro ao atualizar. Tente novamente.");
    },
  });
}

export function useDeleteStatusProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/provas/status/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-status'] });
      toast.success('Status excluído');
    },
    onError: (e: Error) => {
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}
