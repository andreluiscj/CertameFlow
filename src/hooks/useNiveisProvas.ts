import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { NivelProva, NivelProvaInsert, NivelProvaUpdate as NivelProvaPatch } from '@/types/database';

export type { NivelProva, NivelProvaInsert };

export type NivelProvaUpdate = Pick<NivelProva, 'id'> & NivelProvaPatch;

export function useNiveisProvas() {
  return useQuery({
    queryKey: ['provas-niveis'],
    queryFn: () => api.get<NivelProva[]>('/api/provas/niveis'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateNivelProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NivelProvaInsert) => api.post<NivelProva>('/api/provas/niveis', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-niveis'] });
      toast.success('Nível cadastrado');
    },
    onError: (e: Error) => {
      console.error("Erro ao cadastrar", e);
      toast.error("Erro ao cadastrar. Tente novamente.");
    },
  });
}

export function useUpdateNivelProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: NivelProvaUpdate) =>
      api.patch<NivelProva>(`/api/provas/niveis/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-niveis'] });
      toast.success('Nível atualizado');
    },
    onError: (e: Error) => {
      console.error("Erro ao atualizar", e);
      toast.error("Erro ao atualizar. Tente novamente.");
    },
  });
}

export function useDeleteNivelProva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/provas/niveis/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provas-niveis'] });
      toast.success('Nível excluído');
    },
    onError: (e: Error) => {
      console.error("Erro ao excluir", e);
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });
}
